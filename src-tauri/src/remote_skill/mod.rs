use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Runtime};

use crate::automation_config::{replace_profile, AutomationConfigState};
use crate::task_runner::{TaskRun, TaskRunnerState};

const SKILL_STEP_TIMEOUT_MS: u64 = 120_000;
const SERVICE_START_TIMEOUT_MS: u64 = 180_000;
const MAX_RECENT_REMOTE_SKILL_RUNS: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillDefinition {
    pub skill_id: String,
    pub label: String,
    pub kind: String,
    pub category: String,
    pub steps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillProfile {
    pub project_id: String,
    pub machine_id: String,
    pub enabled: bool,
    pub paths: RemoteSkillPaths,
    pub branch: String,
    pub shared_token: String,
    pub update_mode: String,
    pub tasks: RemoteSkillTaskSet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillProfileUpdate {
    pub project_id: String,
    pub machine_id: String,
    pub enabled: Option<bool>,
    pub paths: RemoteSkillPaths,
    pub branch: String,
    pub shared_token: String,
    pub update_mode: String,
    pub tasks: RemoteSkillTaskSet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillPaths {
    pub repo_root: String,
    pub tauri_root: Option<String>,
    pub service_root: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillTaskSet {
    pub fetch_task_id: String,
    pub pull_task_id: Option<String>,
    pub reset_task_id: Option<String>,
    pub stop_service_task_id: String,
    pub start_service_task_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillRequestPayload {
    pub request_id: String,
    pub skill_id: String,
    pub project_id: String,
    pub target_machine_id: String,
    pub branch: String,
    pub commit: String,
    pub service_name: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillExecutionResult {
    pub request_id: String,
    pub skill_id: String,
    pub category: String,
    pub project_id: String,
    pub target_machine_id: String,
    pub success: bool,
    pub stage: String,
    pub current_step: Option<String>,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillProgressEvent {
    pub request_id: String,
    pub skill_id: String,
    pub category: String,
    pub project_id: String,
    pub target_machine_id: String,
    pub stage: String,
    pub current_step: Option<String>,
    pub detail: String,
    pub success: bool,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillRun {
    pub request_id: String,
    pub skill_id: String,
    pub category: String,
    pub project_id: String,
    pub target_machine_id: String,
    pub stage: String,
    pub current_step: Option<String>,
    pub detail: String,
    pub success: bool,
    pub updated_at: u64,
}

pub struct RemoteSkillState {
    definitions: Vec<RemoteSkillDefinition>,
    profiles: Mutex<Vec<RemoteSkillProfile>>,
    recent_runs: Mutex<VecDeque<RemoteSkillRun>>,
}

impl RemoteSkillState {
    pub fn new(profiles: Vec<RemoteSkillProfile>) -> Self {
        Self {
            definitions: default_skill_definitions(),
            profiles: Mutex::new(profiles),
            recent_runs: Mutex::new(VecDeque::new()),
        }
    }

    pub fn get_definitions(&self) -> Vec<RemoteSkillDefinition> {
        self.definitions.clone()
    }

    pub fn update_profile(
        &self,
        automation_config_state: &AutomationConfigState,
        app: &AppHandle<impl Runtime>,
        payload: &RemoteSkillProfileUpdate,
    ) -> Result<Vec<RemoteSkillProfile>, String> {
        validate_profile_update(payload)?;

        let snapshot = automation_config_state.snapshot()?;
        let next_config = replace_profile(&snapshot, payload);
        let persisted = automation_config_state.replace_and_persist(app, next_config)?;

        let mut profiles = self
            .profiles
            .lock()
            .map_err(|_| "failed to lock remote skill profiles".to_string())?;
        *profiles = persisted.profiles.clone();

        Ok(profiles.clone())
    }

    pub fn get_recent_runs(&self) -> Result<Vec<RemoteSkillRun>, String> {
        let runs = self
            .recent_runs
            .lock()
            .map_err(|_| "failed to lock remote skill runs".to_string())?;
        Ok(runs.iter().cloned().collect())
    }

    pub fn validate_request(
        &self,
        payload: &RemoteSkillRequestPayload,
    ) -> Result<(RemoteSkillDefinition, RemoteSkillProfile), String> {
        let definition = self
            .definitions
            .iter()
            .find(|definition| definition.skill_id == payload.skill_id)
            .cloned()
            .ok_or_else(|| format!("unknown remote skill '{}'", payload.skill_id))?;

        let profiles = self
            .profiles
            .lock()
            .map_err(|_| "failed to lock remote skill profiles".to_string())?;

        let profile = profiles
            .iter()
            .find(|profile| {
                profile.project_id == payload.project_id
                    && profile.machine_id == payload.target_machine_id
            })
            .cloned()
            .ok_or_else(|| {
                format!(
                    "no remote skill profile for project '{}' on machine '{}'",
                    payload.project_id, payload.target_machine_id
                )
            })?;

        if !profile.enabled {
            return Err(format!(
                "remote skill profile for project '{}' on machine '{}' is disabled",
                payload.project_id, payload.target_machine_id
            ));
        }

        if profile.shared_token != payload.token {
            return Err("remote skill token mismatch".to_string());
        }

        if profile.branch != payload.branch {
            return Err(format!(
                "remote skill branch mismatch: expected '{}', got '{}'",
                profile.branch, payload.branch
            ));
        }

        Ok((definition, profile))
    }

    pub fn execute_skill(
        &self,
        task_runner_state: &TaskRunnerState,
        payload: &RemoteSkillRequestPayload,
    ) -> Result<(RemoteSkillExecutionResult, Vec<RemoteSkillProgressEvent>), String> {
        let (definition, profile) = self.validate_request(payload)?;
        let mut progress_events = vec![self.record_run(
            &definition,
            payload,
            "received",
            None,
            "Remote skill request accepted.",
            false,
        )];
        let steps = self.expand_steps(&definition)?;
        let total_steps = steps.len();

        for (index, step) in steps.into_iter().enumerate() {
            progress_events.push(self.record_run(
                &definition,
                payload,
                "running",
                Some(step.clone()),
                &format!("Running step {}/{}: '{}'.", index + 1, total_steps, step),
                false,
            ));

            if let Err(error) = run_atomic_step(task_runner_state, &profile, &step) {
                progress_events.push(self.record_run(
                    &definition,
                    payload,
                    "failed",
                    Some(step.clone()),
                    &error,
                    false,
                ));
                return Ok((
                    RemoteSkillExecutionResult {
                        request_id: payload.request_id.clone(),
                        skill_id: payload.skill_id.clone(),
                        category: definition.category.clone(),
                        project_id: payload.project_id.clone(),
                        target_machine_id: payload.target_machine_id.clone(),
                        success: false,
                        stage: "failed".to_string(),
                        current_step: Some(step),
                        detail: error,
                    },
                    progress_events,
                ));
            }

            progress_events.push(self.record_run(
                &definition,
                payload,
                "running",
                Some(step.clone()),
                &format!("Completed step {}/{}: '{}'.", index + 1, total_steps, step),
                false,
            ));
        }

        let detail = format!(
            "Remote skill '{}' completed successfully after {} step(s).",
            payload.skill_id, total_steps
        );
        progress_events.push(self.record_run(&definition, payload, "success", None, &detail, true));

        Ok((
            RemoteSkillExecutionResult {
                request_id: payload.request_id.clone(),
                skill_id: payload.skill_id.clone(),
                category: definition.category.clone(),
                project_id: payload.project_id.clone(),
                target_machine_id: payload.target_machine_id.clone(),
                success: true,
                stage: "success".to_string(),
                current_step: None,
                detail,
            },
            progress_events,
        ))
    }

    pub fn aggregate_runs(runs: Vec<RemoteSkillRun>) -> Vec<RemoteSkillRun> {
        let mut grouped: HashMap<String, RemoteSkillRun> = HashMap::new();

        for run in runs {
            match grouped.get_mut(&run.request_id) {
                Some(existing) if existing.updated_at >= run.updated_at => {}
                Some(existing) => {
                    *existing = run;
                }
                None => {
                    grouped.insert(run.request_id.clone(), run);
                }
            }
        }

        let mut result = grouped.into_values().collect::<Vec<_>>();
        result.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        result.truncate(MAX_RECENT_REMOTE_SKILL_RUNS);
        result
    }

    pub fn build_run(
        definition: &RemoteSkillDefinition,
        payload: &RemoteSkillRequestPayload,
        stage: &str,
        current_step: Option<String>,
        detail: &str,
        success: bool,
    ) -> RemoteSkillRun {
        RemoteSkillRun {
            request_id: payload.request_id.clone(),
            skill_id: payload.skill_id.clone(),
            category: definition.category.clone(),
            project_id: payload.project_id.clone(),
            target_machine_id: payload.target_machine_id.clone(),
            stage: stage.to_string(),
            current_step,
            detail: detail.to_string(),
            success,
            updated_at: current_timestamp_ms(),
        }
    }

    fn expand_steps(&self, definition: &RemoteSkillDefinition) -> Result<Vec<String>, String> {
        let mut expanded = Vec::new();

        for step in &definition.steps {
            let nested = self
                .definitions
                .iter()
                .find(|candidate| candidate.skill_id == *step)
                .ok_or_else(|| format!("unknown skill step '{step}'"))?;

            if nested.kind == "atomic" {
                expanded.push(nested.skill_id.clone());
            } else {
                for nested_step in self.expand_steps(nested)? {
                    expanded.push(nested_step);
                }
            }
        }

        Ok(expanded)
    }

    fn record_run(
        &self,
        definition: &RemoteSkillDefinition,
        payload: &RemoteSkillRequestPayload,
        stage: &str,
        current_step: Option<String>,
        detail: &str,
        success: bool,
    ) -> RemoteSkillProgressEvent {
        let run = Self::build_run(definition, payload, stage, current_step, detail, success);

        if let Ok(mut runs) = self.recent_runs.lock() {
            if let Some(existing) = runs
                .iter_mut()
                .find(|run| run.request_id == payload.request_id)
            {
                *existing = run.clone();
            } else {
                runs.push_back(run.clone());

                if runs.len() > MAX_RECENT_REMOTE_SKILL_RUNS {
                    runs.pop_front();
                }
            }
        }

        RemoteSkillProgressEvent {
            request_id: run.request_id,
            skill_id: run.skill_id,
            category: run.category,
            project_id: run.project_id,
            target_machine_id: run.target_machine_id,
            stage: run.stage,
            current_step: run.current_step,
            detail: run.detail,
            success: run.success,
            updated_at: run.updated_at,
        }
    }
}

fn run_atomic_step(
    task_runner_state: &TaskRunnerState,
    profile: &RemoteSkillProfile,
    step: &str,
) -> Result<TaskRun, String> {
    match step {
        "pull-project" => {
            let cwd = PathBuf::from(&profile.paths.repo_root);
            let task_id = match profile.update_mode.as_str() {
                "reset_hard" => profile
                    .tasks
                    .reset_task_id
                    .clone()
                    .or_else(|| profile.tasks.pull_task_id.clone())
                    .unwrap_or_else(|| profile.tasks.fetch_task_id.clone()),
                _ => profile
                    .tasks
                    .pull_task_id
                    .clone()
                    .unwrap_or_else(|| profile.tasks.fetch_task_id.clone()),
            };

            let run = task_runner_state.run_task_with_cwd(&task_id, Some(cwd))?;
            task_runner_state.wait_for_run(&run.run_id, SKILL_STEP_TIMEOUT_MS)
        }
        "stop-service" => {
            let running_service = task_runner_state
                .get_runs()?
                .into_iter()
                .find(|run| {
                    run.task_id == profile.tasks.start_service_task_id
                        && (run.status == "running" || run.status == "ready")
                });

            if let Some(run) = running_service {
                task_runner_state.stop_task(&run.run_id)
            } else {
                Ok(TaskRun {
                    run_id: format!("virtual-stop-{}", profile.project_id),
                    task_id: profile.tasks.stop_service_task_id.clone(),
                    label: "Stop service".to_string(),
                    kind: "service".to_string(),
                    status: "stopped".to_string(),
                    started_at: 0,
                    finished_at: Some(0),
                    exit_code: None,
                    stdout: String::new(),
                    stderr: "No running service task was found.".to_string(),
                })
            }
        }
        "start-service" => {
            let cwd = PathBuf::from(
                profile
                    .paths
                    .service_root
                    .clone()
                    .unwrap_or_else(|| profile.paths.repo_root.clone()),
            );
            let run =
                task_runner_state.run_task_with_cwd(&profile.tasks.start_service_task_id, Some(cwd))?;
            wait_for_service_ready(task_runner_state, &run.run_id)
        }
        other => Err(format!("unsupported atomic step '{other}'")),
    }
}

fn wait_for_service_ready(
    task_runner_state: &TaskRunnerState,
    run_id: &str,
) -> Result<TaskRun, String> {
    let started_at = current_timestamp_ms();

    loop {
        let run = task_runner_state
            .get_runs()?
            .into_iter()
            .find(|item| item.run_id == run_id)
            .ok_or_else(|| format!("unknown service run id: {run_id}"))?;

        if run.status == "ready" {
            return Ok(run);
        }

        if run.status == "failed" || run.status == "stopped" {
            return Err(format!(
                "service task '{}' ended before reaching ready state",
                run_id
            ));
        }

        if current_timestamp_ms().saturating_sub(started_at) > SERVICE_START_TIMEOUT_MS {
            return Err(format!("timed out waiting for service task '{run_id}' to become ready"));
        }

        std::thread::sleep(std::time::Duration::from_millis(300));
    }
}

fn default_skill_definitions() -> Vec<RemoteSkillDefinition> {
    vec![
        RemoteSkillDefinition {
            skill_id: "pull-project".to_string(),
            label: "Pull project".to_string(),
            kind: "atomic".to_string(),
            category: "repo-sync".to_string(),
            steps: vec!["pull-project".to_string()],
        },
        RemoteSkillDefinition {
            skill_id: "stop-service".to_string(),
            label: "Stop service".to_string(),
            kind: "atomic".to_string(),
            category: "service-control".to_string(),
            steps: vec!["stop-service".to_string()],
        },
        RemoteSkillDefinition {
            skill_id: "start-service".to_string(),
            label: "Start service".to_string(),
            kind: "atomic".to_string(),
            category: "service-control".to_string(),
            steps: vec!["start-service".to_string()],
        },
        RemoteSkillDefinition {
            skill_id: "restart-service".to_string(),
            label: "Restart service".to_string(),
            kind: "composed".to_string(),
            category: "service-control".to_string(),
            steps: vec!["stop-service".to_string(), "start-service".to_string()],
        },
        RemoteSkillDefinition {
            skill_id: "deploy-project".to_string(),
            label: "Deploy project".to_string(),
            kind: "composed".to_string(),
            category: "deployment".to_string(),
            steps: vec!["pull-project".to_string(), "restart-service".to_string()],
        },
    ]
}

fn validate_profile_update(payload: &RemoteSkillProfileUpdate) -> Result<(), String> {
    if payload.project_id.trim().is_empty() {
        return Err("remote skill profile project id cannot be empty".to_string());
    }

    if payload.machine_id.trim().is_empty() {
        return Err("remote skill profile machine id cannot be empty".to_string());
    }

    if payload.paths.repo_root.trim().is_empty() {
        return Err("remote skill profile repo root cannot be empty".to_string());
    }

    if payload.branch.trim().is_empty() {
        return Err("remote skill profile branch cannot be empty".to_string());
    }

    if payload.shared_token.trim().is_empty() {
        return Err("remote skill profile shared token cannot be empty".to_string());
    }

    if !matches!(payload.update_mode.as_str(), "ff_only" | "reset_hard") {
        return Err(format!(
            "unsupported remote skill update mode '{}'",
            payload.update_mode
        ));
    }

    if payload.tasks.fetch_task_id.trim().is_empty()
        || payload.tasks.stop_service_task_id.trim().is_empty()
        || payload.tasks.start_service_task_id.trim().is_empty()
    {
        return Err("remote skill task mapping cannot contain empty required task ids".to_string());
    }

    Ok(())
}

fn current_timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
