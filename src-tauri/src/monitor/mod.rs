use std::{
    collections::VecDeque,
    env,
    fs::File,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    sync::Mutex,
    time::{Duration, SystemTime},
};

use serde::Serialize;
use serde_json::Value;
use sysinfo::System;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorSnapshot {
    pub cpu_load: Option<f32>,
    pub memory_load: Option<f32>,
    pub source: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexStatusSnapshot {
    pub activity: &'static str,
    pub source: &'static str,
    pub detail: Option<String>,
}

pub struct MonitorState {
    system: Mutex<System>,
}

struct CachedCodexSnapshot {
    path: PathBuf,
    modified_at: SystemTime,
    snapshot: CodexStatusSnapshot,
}

pub struct CodexMonitorState {
    cache: Mutex<Option<CachedCodexSnapshot>>,
}

impl MonitorState {
    pub fn new() -> Self {
        let mut system = System::new();
        system.refresh_cpu_usage();
        system.refresh_memory();

        Self {
            system: Mutex::new(system),
        }
    }

    pub fn snapshot(&self) -> Result<MonitorSnapshot, &'static str> {
        let mut system = self
            .system
            .lock()
            .map_err(|_| "failed to lock system monitor state")?;

        system.refresh_cpu_usage();
        system.refresh_memory();

        let total_memory = system.total_memory();
        let used_memory = system.used_memory();

        Ok(MonitorSnapshot {
            cpu_load: Some(normalize_ratio(system.global_cpu_usage() / 100.0)),
            memory_load: (total_memory > 0)
                .then_some(normalize_ratio(used_memory as f32 / total_memory as f32)),
            source: "native",
        })
    }
}

impl CodexMonitorState {
    pub fn new() -> Self {
        Self {
            cache: Mutex::new(None),
        }
    }

    pub fn snapshot(&self) -> CodexStatusSnapshot {
        match resolve_codex_snapshot(&self.cache) {
            Ok(snapshot) => snapshot,
            Err(detail) => CodexStatusSnapshot {
                activity: "idle",
                source: "placeholder",
                detail: Some(detail),
            },
        }
    }
}

fn normalize_ratio(value: f32) -> f32 {
    value.clamp(0.0, 1.0)
}

fn resolve_codex_snapshot(
    cache: &Mutex<Option<CachedCodexSnapshot>>,
) -> Result<CodexStatusSnapshot, String> {
    let session_file = find_latest_rollout_file()?
        .ok_or_else(|| "no local codex rollout session found".to_string())?;
    let metadata = session_file
        .metadata()
        .map_err(|error| format!("failed to read rollout metadata: {error}"))?;
    let modified_at = metadata
        .modified()
        .map_err(|error| format!("failed to read rollout modified time: {error}"))?;

    {
        let cache = cache
            .lock()
            .map_err(|_| "failed to lock codex monitor cache".to_string())?;

        if let Some(cached) = cache.as_ref() {
            if cached.path == session_file && cached.modified_at == modified_at {
                return Ok(cached.snapshot.clone());
            }
        }
    }

    let recent_events = read_recent_rollout_events(&session_file, 48)?;

    let snapshot = if recent_events.is_empty() {
        CodexStatusSnapshot {
            activity: "idle",
            source: "native",
            detail: Some("latest rollout is empty".to_string()),
        }
    } else {
        map_rollout_events_to_snapshot(&recent_events, modified_at, &session_file)
    };

    let mut cache = cache
        .lock()
        .map_err(|_| "failed to lock codex monitor cache".to_string())?;
    *cache = Some(CachedCodexSnapshot {
        path: session_file,
        modified_at,
        snapshot: snapshot.clone(),
    });

    Ok(snapshot)
}

fn map_rollout_events_to_snapshot(
    events: &[RolloutEvent],
    modified_at: SystemTime,
    session_file: &Path,
) -> CodexStatusSnapshot {
    let file_name = session_file
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("rollout");
    let recent_elapsed = SystemTime::now()
        .duration_since(modified_at)
        .unwrap_or(Duration::from_secs(0));
    let done_window = Duration::from_secs(12);
    let idle_threshold = Duration::from_secs(45);

    if recent_elapsed > idle_threshold {
        return CodexStatusSnapshot {
            activity: "idle",
            source: "native",
            detail: Some(format!("{file_name}: no recent codex activity")),
        };
    }

    for event in events.iter().rev() {
        if is_notice_event(event) {
            return CodexStatusSnapshot {
                activity: "notice",
                source: "native",
                detail: Some(format!(
                    "{file_name}: {}",
                    event
                        .detail
                        .as_deref()
                        .or(event.name.as_deref())
                        .unwrap_or("permission request or notification")
                )),
            };
        }

        if is_celebrate_event(event) {
            return CodexStatusSnapshot {
                activity: "celebrate",
                source: "native",
                detail: Some(format!(
                    "{file_name}: {}",
                    event
                        .detail
                        .as_deref()
                        .or(event.name.as_deref())
                        .unwrap_or("post compact or graceful stop")
                )),
            };
        }

        if is_error_burst_event(event) {
            return CodexStatusSnapshot {
                activity: "error_burst",
                source: "native",
                detail: Some(format!(
                    "{file_name}: {}",
                    event
                        .detail
                        .as_deref()
                        .or(event.name.as_deref())
                        .unwrap_or("post tool use failure")
                )),
            };
        }

        if is_error_event(event) {
            return CodexStatusSnapshot {
                activity: "error",
                source: "native",
                detail: Some(format!(
                    "{file_name}: {}",
                    event
                        .detail
                        .as_deref()
                        .unwrap_or("recent tool execution failed")
                )),
            };
        }

        if event.outer_type == "event_msg" && event.inner_type.as_deref() == Some("task_complete") {
            return CodexStatusSnapshot {
                activity: if recent_elapsed <= done_window {
                    "done"
                } else {
                    "waiting_input"
                },
                source: "native",
                detail: Some(format!(
                    "{file_name}: {}",
                    if recent_elapsed <= done_window {
                        "task completed"
                    } else {
                        "waiting for next prompt"
                    }
                )),
            };
        }

        if event.outer_type == "response_item"
            && event.inner_type.as_deref() == Some("message")
            && event.phase.as_deref() == Some("final_answer")
        {
            return CodexStatusSnapshot {
                activity: if recent_elapsed <= done_window {
                    "done"
                } else {
                    "waiting_input"
                },
                source: "native",
                detail: Some(format!(
                    "{file_name}: {}",
                    if recent_elapsed <= done_window {
                        "final answer ready"
                    } else {
                        "waiting for next prompt"
                    }
                )),
            };
        }

        if event.outer_type == "response_item"
            && matches!(
                event.inner_type.as_deref(),
                Some("function_call") | Some("custom_tool_call") | Some("web_search_call")
            )
        {
            return CodexStatusSnapshot {
                activity: "acting",
                source: "native",
                detail: Some(format!(
                    "{file_name}: running {}",
                    event.name.as_deref().unwrap_or("tool")
                )),
            };
        }

        if event.outer_type == "response_item" && event.inner_type.as_deref() == Some("reasoning") {
            return CodexStatusSnapshot {
                activity: "thinking",
                source: "native",
                detail: Some(format!("{file_name}: reasoning")),
            };
        }

        if event.outer_type == "event_msg" && event.inner_type.as_deref() == Some("user_message") {
            return CodexStatusSnapshot {
                activity: "thinking",
                source: "native",
                detail: Some(format!("{file_name}: new user message")),
            };
        }
    }

    CodexStatusSnapshot {
        activity: "idle",
        source: "native",
        detail: Some(format!("{file_name}: waiting for next event")),
    }
}

fn is_error_event(event: &RolloutEvent) -> bool {
    let Some(detail) = event.detail.as_deref() else {
        return false;
    };

    let normalized = detail.to_ascii_lowercase();
    normalized.contains("process exited with code 1")
        || normalized.contains("exit code 1")
        || normalized.contains("exec_command failed")
        || normalized.contains("sandboxdenied")
        || normalized.contains("### error")
        || normalized.starts_with("error:")
}

fn is_notice_event(event: &RolloutEvent) -> bool {
    event_name_contains(event, &["permissionrequest", "notification"])
        || detail_contains(event, &["permission request", "notification"])
}

fn is_celebrate_event(event: &RolloutEvent) -> bool {
    event_name_contains(event, &["postcompact", "gracefulstop"])
        || detail_contains(event, &["post compact", "graceful stop"])
}

fn is_error_burst_event(event: &RolloutEvent) -> bool {
    event_name_contains(event, &["posttoolusefailure", "stopfailure"])
        || detail_contains(event, &["post tool use failure", "stop failure"])
}

fn event_name_contains(event: &RolloutEvent, needles: &[&str]) -> bool {
    let haystacks = [
        event.outer_type.as_str(),
        event.inner_type.as_deref().unwrap_or_default(),
        event.phase.as_deref().unwrap_or_default(),
        event.name.as_deref().unwrap_or_default(),
    ];

    haystacks.iter().any(|haystack| {
        let normalized = haystack.to_ascii_lowercase();
        needles
            .iter()
            .any(|needle| normalized.contains(needle))
    })
}

fn detail_contains(event: &RolloutEvent, needles: &[&str]) -> bool {
    let Some(detail) = event.detail.as_deref() else {
        return false;
    };

    let normalized = detail.to_ascii_lowercase();
    needles
        .iter()
        .any(|needle| normalized.contains(needle))
}

fn find_latest_rollout_file() -> Result<Option<PathBuf>, String> {
    let home_dir = env::var("HOME").map_err(|error| format!("failed to resolve HOME: {error}"))?;
    let sessions_root = Path::new(&home_dir).join(".codex").join("sessions");

    if !sessions_root.exists() {
        return Ok(None);
    }

    let mut latest: Option<(SystemTime, PathBuf)> = None;
    visit_rollout_files(&sessions_root, &mut |path| {
        if let Ok(metadata) = path.metadata() {
            if let Ok(modified_at) = metadata.modified() {
                let should_replace = latest
                    .as_ref()
                    .map(|(current, _)| modified_at > *current)
                    .unwrap_or(true);

                if should_replace {
                    latest = Some((modified_at, path.to_path_buf()));
                }
            }
        }
    })
    .map_err(|error| format!("failed to scan codex sessions: {error}"))?;

    Ok(latest.map(|(_, path)| path))
}

fn visit_rollout_files(
    dir: &Path,
    visitor: &mut impl FnMut(&Path),
) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            visit_rollout_files(&path, visitor)?;
            continue;
        }

        let is_rollout = path
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.starts_with("rollout-") && name.ends_with(".jsonl"))
            .unwrap_or(false);

        if is_rollout {
            visitor(&path);
        }
    }

    Ok(())
}

fn read_recent_rollout_events(
    path: &Path,
    limit: usize,
) -> Result<Vec<RolloutEvent>, String> {
    let file = File::open(path).map_err(|error| format!("failed to open rollout file: {error}"))?;
    let reader = BufReader::new(file);
    let mut recent_lines = VecDeque::with_capacity(limit);

    for line in reader.lines() {
        let line = line.map_err(|error| format!("failed to read rollout line: {error}"))?;
        if recent_lines.len() == limit {
            recent_lines.pop_front();
        }
        recent_lines.push_back(line);
    }

    let mut events = Vec::with_capacity(recent_lines.len());

    for line in recent_lines {
        let Ok(value) = serde_json::from_str::<Value>(&line) else {
            continue;
        };

        let outer_type = value
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let payload = value.get("payload").and_then(Value::as_object);
        let inner_type = payload
            .and_then(|payload| payload.get("type"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned);
        let phase = payload
            .and_then(|payload| payload.get("phase"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned);
        let name = payload
            .and_then(|payload| payload.get("name"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned);
        let detail = payload
            .and_then(|payload| payload.get("output"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .or_else(|| {
                payload
                    .and_then(|payload| payload.get("message"))
                    .and_then(Value::as_str)
                    .map(ToOwned::to_owned)
            });

        events.push(RolloutEvent {
            outer_type,
            inner_type,
            phase,
            name,
            detail,
        });
    }

    Ok(events)
}

#[derive(Debug, Clone)]
struct RolloutEvent {
    outer_type: String,
    inner_type: Option<String>,
    phase: Option<String>,
    name: Option<String>,
    detail: Option<String>,
}
