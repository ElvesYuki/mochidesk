use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

use crate::remote_skill::{
    RemoteSkillPaths, RemoteSkillProfile, RemoteSkillProfileUpdate, RemoteSkillTaskSet,
};

const CONFIG_FILE_NAME: &str = "remote-automation.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutboundSkillConfig {
    pub config_id: String,
    pub label: String,
    pub enabled: bool,
    pub skill_id: String,
    pub project_id: String,
    pub target_machine_id: String,
    pub branch: String,
    pub service_name: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSkillTrigger {
    pub trigger_id: String,
    pub label: String,
    pub enabled: bool,
    pub type_: String,
    pub skill_config_id: String,
    pub task_id: Option<String>,
    pub fire_on_status: String,
    pub last_triggered_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationConfig {
    pub outbound_skill_configs: Vec<OutboundSkillConfig>,
    pub triggers: Vec<RemoteSkillTrigger>,
    pub profiles: Vec<RemoteSkillProfile>,
}

pub struct AutomationConfigState {
    config: Mutex<AutomationConfig>,
}

impl AutomationConfigState {
    pub fn new<R: Runtime>(app: &AppHandle<R>) -> Self {
        let config = load_config(app).unwrap_or_else(|_| default_config());
        Self {
            config: Mutex::new(config),
        }
    }

    pub fn snapshot(&self) -> Result<AutomationConfig, String> {
        let config = self
            .config
            .lock()
            .map_err(|_| "failed to lock automation config".to_string())?;
        Ok(config.clone())
    }

    pub fn replace_and_persist<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        next_config: AutomationConfig,
    ) -> Result<AutomationConfig, String> {
        save_config(app, &next_config)?;
        let mut config = self
            .config
            .lock()
            .map_err(|_| "failed to lock automation config".to_string())?;
        *config = next_config.clone();
        Ok(next_config)
    }

    pub fn config_path<R: Runtime>(&self, app: &AppHandle<R>) -> Result<PathBuf, String> {
        config_path(app)
    }
}

pub fn default_config() -> AutomationConfig {
    AutomationConfig {
        outbound_skill_configs: vec![OutboundSkillConfig {
            config_id: "deploy-mochidesk-windows".to_string(),
            label: "Deploy MochiDesk to Windows runner".to_string(),
            enabled: true,
            skill_id: "deploy-project".to_string(),
            project_id: "mochidesk".to_string(),
            target_machine_id: "windows-runner-01".to_string(),
            branch: "main".to_string(),
            service_name: "mochidesk".to_string(),
            token: "change-me".to_string(),
        }],
        triggers: vec![
            RemoteSkillTrigger {
                trigger_id: "push-main-then-deploy".to_string(),
                label: "Push main then deploy".to_string(),
                enabled: true,
                type_: "task-success".to_string(),
                skill_config_id: "deploy-mochidesk-windows".to_string(),
                task_id: Some("git_push_project".to_string()),
                fire_on_status: "success".to_string(),
                last_triggered_at: None,
            },
            RemoteSkillTrigger {
                trigger_id: "manual-deploy-mochidesk".to_string(),
                label: "Manual deploy trigger".to_string(),
                enabled: true,
                type_: "manual".to_string(),
                skill_config_id: "deploy-mochidesk-windows".to_string(),
                task_id: None,
                fire_on_status: "success".to_string(),
                last_triggered_at: None,
            },
        ],
        profiles: vec![RemoteSkillProfile {
            project_id: "mochidesk".to_string(),
            machine_id: "windows-runner-01".to_string(),
            enabled: true,
            paths: RemoteSkillPaths {
                repo_root: "D:\\workspace\\mochidesk".to_string(),
                tauri_root: Some("D:\\workspace\\mochidesk\\src-tauri".to_string()),
                service_root: Some("D:\\workspace\\mochidesk".to_string()),
            },
            branch: "main".to_string(),
            shared_token: "change-me".to_string(),
            update_mode: "reset_hard".to_string(),
            tasks: RemoteSkillTaskSet {
                fetch_task_id: "git_pull_project".to_string(),
                pull_task_id: Some("git_pull_project".to_string()),
                reset_task_id: None,
                stop_service_task_id: "pnpm_dev_project".to_string(),
                start_service_task_id: "pnpm_dev_project".to_string(),
            },
        }],
    }
}

pub fn replace_profile(config: &AutomationConfig, payload: &RemoteSkillProfileUpdate) -> AutomationConfig {
    let mut next = config.clone();
    let profile = RemoteSkillProfile {
        project_id: payload.project_id.clone(),
        machine_id: payload.machine_id.clone(),
        enabled: payload.enabled.unwrap_or(true),
        paths: payload.paths.clone(),
        branch: payload.branch.clone(),
        shared_token: payload.shared_token.clone(),
        update_mode: payload.update_mode.clone(),
        tasks: payload.tasks.clone(),
    };

    if let Some(existing) = next
        .profiles
        .iter_mut()
        .find(|item| item.project_id == payload.project_id)
    {
        *existing = profile;
    } else {
        next.profiles.push(profile);
    }

    next
}

fn load_config<R: Runtime>(app: &AppHandle<R>) -> Result<AutomationConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        let config = default_config();
        save_config(app, &config)?;
        return Ok(config);
    }

    let text = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read automation config '{}': {error}", path.display()))?;
    serde_json::from_str::<AutomationConfig>(&text)
        .map_err(|error| format!("failed to parse automation config '{}': {error}", path.display()))
}

fn save_config<R: Runtime>(app: &AppHandle<R>, config: &AutomationConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "failed to create automation config directory '{}': {error}",
                parent.display()
            )
        })?;
    }

    let text = serde_json::to_string_pretty(config)
        .map_err(|error| format!("failed to serialize automation config: {error}"))?;
    fs::write(&path, text)
        .map_err(|error| format!("failed to write automation config '{}': {error}", path.display()))
}

fn config_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("failed to resolve app config dir: {error}"))?;
    Ok(dir.join(CONFIG_FILE_NAME))
}
