use std::{
    collections::VecDeque,
    io::{BufRead, BufReader},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::Serialize;

const MAX_RUN_HISTORY: usize = 20;
const MAX_OUTPUT_CHARS: usize = 20_000;
const SERVICE_READY_MARKERS: [&str; 8] = [
    "ready in",
    "local:",
    "network:",
    "listening on",
    "server running",
    "compiled successfully",
    "app ready",
    "started server",
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDefinition {
    pub id: &'static str,
    pub label: &'static str,
    pub kind: &'static str,
    pub command_preview: &'static str,
    pub cwd: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRun {
    pub run_id: String,
    pub task_id: String,
    pub label: String,
    pub kind: String,
    pub status: String,
    pub started_at: u64,
    pub finished_at: Option<u64>,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskStreamSnapshot {
    pub runs: Vec<TaskRun>,
}

#[derive(Debug, Clone, Copy)]
struct TaskTemplate {
    id: &'static str,
    label: &'static str,
    kind: TaskKind,
    command: &'static str,
    args: &'static [&'static str],
    cwd_kind: TaskCwdKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TaskKind {
    Check,
    Service,
}

#[derive(Debug, Clone, Copy)]
enum TaskCwdKind {
    WorkspaceRoot,
    TauriRoot,
}

struct RunningTaskHandle {
    run_id: String,
    child: Arc<Mutex<Child>>,
}

pub struct TaskRunnerState {
    runs: Arc<Mutex<VecDeque<TaskRun>>>,
    active_tasks: Arc<Mutex<Vec<RunningTaskHandle>>>,
}

impl TaskRunnerState {
    pub fn new() -> Self {
        Self {
            runs: Arc::new(Mutex::new(VecDeque::new())),
            active_tasks: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn list_tasks(&self) -> Vec<TaskDefinition> {
        TASK_TEMPLATES
            .iter()
            .map(|task| TaskDefinition {
                id: task.id,
                label: task.label,
                kind: task.kind.as_str(),
                command_preview: task.command_preview(),
                cwd: resolve_cwd(task.cwd_kind).display().to_string(),
            })
            .collect()
    }

    pub fn run_task(&self, task_id: &str) -> Result<TaskRun, String> {
        self.run_task_with_cwd(task_id, None)
    }

    pub fn run_task_with_cwd(&self, task_id: &str, cwd_override: Option<PathBuf>) -> Result<TaskRun, String> {
        let task = TASK_TEMPLATES
            .iter()
            .find(|task| task.id == task_id)
            .ok_or_else(|| format!("unknown task id: {task_id}"))?;
        let started_at = current_timestamp_ms();
        let run = TaskRun {
            run_id: format!("{}-{}", task.id, started_at),
            task_id: task.id.to_string(),
            label: task.label.to_string(),
            kind: task.kind.as_str().to_string(),
            status: "running".to_string(),
            started_at,
            finished_at: None,
            exit_code: None,
            stdout: String::new(),
            stderr: String::new(),
        };

        self.push_run(run.clone())?;

        let task = *task;
        let run_id = run.run_id.clone();
        let cwd_override = cwd_override.clone();
        let runs = Arc::clone(&self.runs);
        let active_tasks = Arc::clone(&self.active_tasks);

        thread::spawn(move || {
            let cwd = cwd_override.unwrap_or_else(|| resolve_cwd(task.cwd_kind));
            let command_result = Command::new(task.command)
                .args(task.args)
                .current_dir(&cwd)
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn();

            let mut child = match command_result {
                Ok(child) => child,
                Err(error) => {
                    update_run(
                        &runs,
                        &run_id,
                        TaskRun {
                            run_id: run_id.clone(),
                            task_id: task.id.to_string(),
                            label: task.label.to_string(),
                            kind: task.kind.as_str().to_string(),
                            status: "failed".to_string(),
                            started_at,
                            finished_at: Some(current_timestamp_ms()),
                            exit_code: None,
                            stdout: String::new(),
                            stderr: format!("failed to run task '{}': {error}", task.id),
                        },
                    );
                    return;
                }
            };

            let stdout = child.stdout.take();
            let stderr = child.stderr.take();
            let child = Arc::new(Mutex::new(child));

            if let Ok(mut active) = active_tasks.lock() {
                active.push(RunningTaskHandle {
                    run_id: run_id.clone(),
                    child: Arc::clone(&child),
                });
            }

            let stdout_buffer = Arc::new(Mutex::new(String::new()));
            let stderr_buffer = Arc::new(Mutex::new(String::new()));

            let stdout_reader = stdout.map(|stdout| {
                let stdout_buffer = Arc::clone(&stdout_buffer);
                thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        match line {
                            Ok(line) => append_output(&stdout_buffer, &line),
                            Err(_) => break,
                        }
                    }
                })
            });

            let stderr_reader = stderr.map(|stderr| {
                let stderr_buffer = Arc::clone(&stderr_buffer);
                thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines() {
                        match line {
                            Ok(line) => append_output(&stderr_buffer, &line),
                            Err(_) => break,
                        }
                    }
                })
            });

            loop {
                let maybe_status = if let Ok(mut child) = child.lock() {
                    child.try_wait().ok().flatten()
                } else {
                    None
                };

                let stdout = stdout_buffer
                    .lock()
                    .map(|buffer| buffer.clone())
                    .unwrap_or_default();
                let stderr = stderr_buffer
                    .lock()
                    .map(|buffer| buffer.clone())
                    .unwrap_or_default();

                if let Some(status) = maybe_status {
                    if let Some(handle) = stdout_reader {
                        let _ = handle.join();
                    }
                    if let Some(handle) = stderr_reader {
                        let _ = handle.join();
                    }

                    let final_stdout = stdout_buffer
                        .lock()
                        .map(|buffer| buffer.clone())
                        .unwrap_or(stdout);
                    let final_stderr = stderr_buffer
                        .lock()
                        .map(|buffer| buffer.clone())
                        .unwrap_or(stderr);
                    let final_status = if task.kind == TaskKind::Service && status.success() {
                        "stopped".to_string()
                    } else if status.success() {
                        "success".to_string()
                    } else {
                        "failed".to_string()
                    };

                    update_run(
                        &runs,
                        &run_id,
                        TaskRun {
                            run_id: run_id.clone(),
                            task_id: task.id.to_string(),
                            label: task.label.to_string(),
                            kind: task.kind.as_str().to_string(),
                            status: final_status,
                            started_at,
                            finished_at: Some(current_timestamp_ms()),
                            exit_code: status.code(),
                            stdout: final_stdout,
                            stderr: final_stderr,
                        },
                    );
                    remove_active_task(&active_tasks, &run_id);
                    break;
                }

                update_running_output(&runs, &run_id, &task, stdout, stderr);
                thread::sleep(Duration::from_millis(240));
            }
        });

        Ok(run)
    }

    pub fn stop_task(&self, run_id: &str) -> Result<TaskRun, String> {
        let child = {
            let active_tasks = self
                .active_tasks
                .lock()
                .map_err(|_| "failed to lock active task registry".to_string())?;
            active_tasks
                .iter()
                .find(|task| task.run_id == run_id)
                .map(|task| Arc::clone(&task.child))
        }
        .ok_or_else(|| format!("unknown active run id: {run_id}"))?;

        {
            let mut child = child
                .lock()
                .map_err(|_| "failed to lock task process".to_string())?;
            child
                .kill()
                .map_err(|error| format!("failed to stop task '{run_id}': {error}"))?;
        }

        thread::sleep(Duration::from_millis(120));
        remove_active_task(&self.active_tasks, run_id);

        let mut runs = self
            .runs
            .lock()
            .map_err(|_| "failed to lock task run history".to_string())?;
        let run = runs
            .iter_mut()
            .find(|item| item.run_id == run_id)
            .ok_or_else(|| format!("unknown run id: {run_id}"))?;

        run.status = "stopped".to_string();
        run.finished_at = Some(current_timestamp_ms());
        run.exit_code = None;
        if run.stderr.is_empty() {
            run.stderr = "Task was stopped from the control panel.".to_string();
        } else if !run.stderr.contains("Task was stopped from the control panel.") {
            run.stderr = format!("{}\nTask was stopped from the control panel.", run.stderr);
        }

        Ok(run.clone())
    }

    pub fn get_runs(&self) -> Result<Vec<TaskRun>, String> {
        let runs = self
            .runs
            .lock()
            .map_err(|_| "failed to lock task run history".to_string())?;
        Ok(runs.iter().cloned().collect())
    }

    pub fn get_snapshot(&self) -> Result<TaskStreamSnapshot, String> {
        Ok(TaskStreamSnapshot {
            runs: self.get_runs()?,
        })
    }

    pub fn wait_for_run(&self, run_id: &str, timeout_ms: u64) -> Result<TaskRun, String> {
        let started_at = current_timestamp_ms();

        loop {
            let run = {
                let runs = self
                    .runs
                    .lock()
                    .map_err(|_| "failed to lock task run history".to_string())?;
                runs.iter().find(|item| item.run_id == run_id).cloned()
            }
            .ok_or_else(|| format!("unknown run id: {run_id}"))?;

            if run.status != "running" {
                return Ok(run);
            }

            if current_timestamp_ms().saturating_sub(started_at) > timeout_ms {
                return Err(format!("timed out waiting for task '{run_id}'"));
            }

            thread::sleep(Duration::from_millis(240));
        }
    }

    fn push_run(&self, run: TaskRun) -> Result<(), String> {
        let mut runs = self
            .runs
            .lock()
            .map_err(|_| "failed to lock task run history".to_string())?;
        runs.push_back(run);
        if runs.len() > MAX_RUN_HISTORY {
            runs.pop_front();
        }
        Ok(())
    }
}

fn append_output(buffer: &Arc<Mutex<String>>, line: &str) {
    if let Ok(mut buffer) = buffer.lock() {
        if !buffer.is_empty() {
            buffer.push('\n');
        }
        buffer.push_str(line);

        if buffer.len() > MAX_OUTPUT_CHARS {
            let overflow = buffer.len() - MAX_OUTPUT_CHARS;
            buffer.drain(..overflow);
        }
    }
}

fn update_run(runs: &Arc<Mutex<VecDeque<TaskRun>>>, run_id: &str, next_run: TaskRun) {
    if let Ok(mut runs) = runs.lock() {
        if let Some(existing) = runs.iter_mut().find(|item| item.run_id == run_id) {
            *existing = next_run;
        }
    }
}

fn update_running_output(
    runs: &Arc<Mutex<VecDeque<TaskRun>>>,
    run_id: &str,
    task: &TaskTemplate,
    stdout: String,
    stderr: String,
) {
    if let Ok(mut runs) = runs.lock() {
        if let Some(existing) = runs.iter_mut().find(|item| item.run_id == run_id) {
            if existing.status == "running" {
                existing.stdout = stdout;
                existing.stderr = stderr;

                if task.kind == TaskKind::Service
                    && detect_service_ready(&existing.stdout, &existing.stderr)
                {
                    existing.status = "ready".to_string();
                }
            }
        }
    }
}

fn detect_service_ready(stdout: &str, stderr: &str) -> bool {
    let haystack = format!("{stdout}\n{stderr}").to_lowercase();
    SERVICE_READY_MARKERS
        .iter()
        .any(|marker| haystack.contains(marker))
}

fn remove_active_task(active_tasks: &Arc<Mutex<Vec<RunningTaskHandle>>>, run_id: &str) {
    if let Ok(mut active_tasks) = active_tasks.lock() {
        active_tasks.retain(|task| task.run_id != run_id);
    }
}

impl TaskTemplate {
    fn command_preview(&self) -> &'static str {
        match self.id {
            "git_pull_project" => "git pull",
            "git_push_project" => "git push origin main",
            "pnpm_check_project" => "pnpm check",
            "cargo_check_tauri" => "cargo check",
            "pnpm_dev_project" => "pnpm dev",
            _ => self.command,
        }
    }
}

impl TaskKind {
    fn as_str(self) -> &'static str {
        match self {
            TaskKind::Check => "check",
            TaskKind::Service => "service",
        }
    }
}

const TASK_TEMPLATES: [TaskTemplate; 5] = [
    TaskTemplate {
        id: "git_pull_project",
        label: "Git pull project",
        kind: TaskKind::Check,
        command: "git",
        args: &["pull"],
        cwd_kind: TaskCwdKind::WorkspaceRoot,
    },
    TaskTemplate {
        id: "git_push_project",
        label: "Git push origin main",
        kind: TaskKind::Check,
        command: "git",
        args: &["push", "origin", "main"],
        cwd_kind: TaskCwdKind::WorkspaceRoot,
    },
    TaskTemplate {
        id: "pnpm_check_project",
        label: "Run pnpm check",
        kind: TaskKind::Check,
        command: "pnpm",
        args: &["check"],
        cwd_kind: TaskCwdKind::WorkspaceRoot,
    },
    TaskTemplate {
        id: "cargo_check_tauri",
        label: "Run cargo check",
        kind: TaskKind::Check,
        command: "cargo",
        args: &["check"],
        cwd_kind: TaskCwdKind::TauriRoot,
    },
    TaskTemplate {
        id: "pnpm_dev_project",
        label: "Run pnpm dev",
        kind: TaskKind::Service,
        command: "pnpm",
        args: &["dev"],
        cwd_kind: TaskCwdKind::WorkspaceRoot,
    },
];

fn resolve_cwd(kind: TaskCwdKind) -> PathBuf {
    let tauri_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    match kind {
        TaskCwdKind::WorkspaceRoot => tauri_root
            .parent()
            .map(PathBuf::from)
            .unwrap_or(tauri_root),
        TaskCwdKind::TauriRoot => tauri_root,
    }
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
