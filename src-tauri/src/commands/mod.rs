use crate::automation_config::AutomationConfigState;
use crate::monitor::{CodexMonitorState, CodexStatusSnapshot, MonitorSnapshot, MonitorState};
use crate::network::{LanMessage, LanPeer, LocalIdentity, NetworkEvent, NetworkState};
use crate::remote_skill::{
    RemoteSkillDefinition, RemoteSkillExecutionResult, RemoteSkillProfile, RemoteSkillProfileUpdate,
    RemoteSkillRequestPayload, RemoteSkillRun, RemoteSkillState,
};
use crate::task_runner::{TaskDefinition, TaskRun, TaskRunnerState, TaskStreamSnapshot};

#[tauri::command]
fn get_system_monitor_snapshot(
    monitor_state: tauri::State<'_, MonitorState>,
) -> Result<MonitorSnapshot, String> {
    monitor_state
        .snapshot()
        .map_err(std::string::ToString::to_string)
}

#[tauri::command]
fn get_codex_status_snapshot(
    codex_monitor_state: tauri::State<'_, CodexMonitorState>,
) -> Result<CodexStatusSnapshot, String> {
    Ok(codex_monitor_state.snapshot())
}

#[tauri::command]
fn start_udp_listener(
    network_state: tauri::State<'_, NetworkState>,
    port: Option<u16>,
) -> Result<u16, String> {
    network_state.start_listener(port)
}

#[tauri::command]
fn stop_udp_listener(network_state: tauri::State<'_, NetworkState>) -> Result<(), String> {
    network_state.stop_listener()
}

#[tauri::command]
fn broadcast_udp_message(
    network_state: tauri::State<'_, NetworkState>,
    message: LanMessage,
    port: Option<u16>,
) -> Result<(), String> {
    network_state.broadcast_message(message, port)
}

#[tauri::command]
fn send_udp_message(
    network_state: tauri::State<'_, NetworkState>,
    target: String,
    message: LanMessage,
) -> Result<(), String> {
    network_state.send_message(&target, message)
}

#[tauri::command]
fn get_known_peers(network_state: tauri::State<'_, NetworkState>) -> Result<Vec<LanPeer>, String> {
    network_state.get_known_peers()
}

#[tauri::command]
fn get_recent_network_events(
    network_state: tauri::State<'_, NetworkState>,
) -> Result<Vec<NetworkEvent>, String> {
    network_state.get_recent_events()
}

#[tauri::command]
fn dequeue_remote_skill_request(
    network_state: tauri::State<'_, NetworkState>,
) -> Result<Option<serde_json::Value>, String> {
    network_state.dequeue_remote_skill_request()
}

#[tauri::command]
fn get_local_udp_identity(
    network_state: tauri::State<'_, NetworkState>,
) -> Result<LocalIdentity, String> {
    Ok(network_state.get_local_identity())
}

#[tauri::command]
fn get_remote_skill_definitions(
    remote_skill_state: tauri::State<'_, RemoteSkillState>,
) -> Result<Vec<RemoteSkillDefinition>, String> {
    Ok(remote_skill_state.get_definitions())
}

#[tauri::command]
fn get_remote_skill_profiles(
    automation_config_state: tauri::State<'_, AutomationConfigState>,
) -> Result<Vec<RemoteSkillProfile>, String> {
    Ok(automation_config_state.snapshot()?.profiles)
}

#[tauri::command]
fn get_remote_automation_config(
    automation_config_state: tauri::State<'_, AutomationConfigState>,
) -> Result<crate::automation_config::AutomationConfig, String> {
    automation_config_state.snapshot()
}

#[tauri::command]
fn get_remote_automation_config_path(
    app: tauri::AppHandle,
    automation_config_state: tauri::State<'_, AutomationConfigState>,
) -> Result<String, String> {
    let path = automation_config_state.config_path(&app)?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn reveal_remote_automation_config(
    app: tauri::AppHandle,
    automation_config_state: tauri::State<'_, AutomationConfigState>,
    reveal_parent: Option<bool>,
) -> Result<(), String> {
    let path = automation_config_state.config_path(&app)?;
    let target = if reveal_parent.unwrap_or(false) {
        path.parent()
            .map(|parent| parent.to_path_buf())
            .unwrap_or(path)
    } else {
        path
    };

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(target)
            .spawn()
            .map_err(|error| format!("failed to reveal automation config: {error}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(target)
            .spawn()
            .map_err(|error| format!("failed to reveal automation config: {error}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(target)
            .spawn()
            .map_err(|error| format!("failed to reveal automation config: {error}"))?;
    }

    Ok(())
}

#[tauri::command]
fn update_remote_automation_config(
    app: tauri::AppHandle,
    automation_config_state: tauri::State<'_, AutomationConfigState>,
    payload: crate::automation_config::AutomationConfig,
) -> Result<crate::automation_config::AutomationConfig, String> {
    automation_config_state.replace_and_persist(&app, payload)
}

#[tauri::command]
fn update_remote_skill_profile(
    app: tauri::AppHandle,
    automation_config_state: tauri::State<'_, AutomationConfigState>,
    remote_skill_state: tauri::State<'_, RemoteSkillState>,
    payload: RemoteSkillProfileUpdate,
) -> Result<Vec<RemoteSkillProfile>, String> {
    remote_skill_state.update_profile(&automation_config_state, &app, &payload)
}

#[tauri::command]
fn get_recent_remote_skill_runs(
    remote_skill_state: tauri::State<'_, RemoteSkillState>,
    network_state: tauri::State<'_, NetworkState>,
) -> Result<Vec<RemoteSkillRun>, String> {
    let mut runs = remote_skill_state.get_recent_runs()?;
    runs.extend(network_state.get_remote_skill_status_messages()?);
    Ok(RemoteSkillState::aggregate_runs(runs))
}

#[tauri::command]
fn run_remote_skill(
    remote_skill_state: tauri::State<'_, RemoteSkillState>,
    network_state: tauri::State<'_, NetworkState>,
    task_runner_state: tauri::State<'_, TaskRunnerState>,
    payload: RemoteSkillRequestPayload,
) -> Result<RemoteSkillExecutionResult, String> {
    let identity = network_state.get_local_identity();
    let (definition, _) = remote_skill_state.validate_request(&payload)?;
    let ack_message = LanMessage {
        version: 1,
        message_type: "deploy_ack".to_string(),
        sender_id: identity.sender_id.clone(),
        sender_name: identity.sender_name.clone(),
        timestamp: 0,
        payload: serde_json::to_value(RemoteSkillState::build_run(
            &definition,
            &payload,
            "received",
            None,
            "Remote skill request acknowledged.",
            false,
        ))
        .map_err(|error| format!("failed to serialize remote skill ack: {error}"))?,
    };
    network_state.broadcast_message(ack_message, None)?;

    let (execution_result, progress_events) =
        remote_skill_state.execute_skill(&task_runner_state, &payload)?;

    for progress in progress_events.iter().filter(|event| event.stage == "running") {
        let message = LanMessage {
            version: 1,
            message_type: "deploy_progress".to_string(),
            sender_id: identity.sender_id.clone(),
            sender_name: identity.sender_name.clone(),
            timestamp: 0,
            payload: serde_json::to_value(progress)
                .map_err(|error| format!("failed to serialize remote skill progress: {error}"))?,
        };
        network_state.broadcast_message(message, None)?;
    }

    let message = LanMessage {
        version: 1,
        message_type: "deploy_result".to_string(),
        sender_id: identity.sender_id,
        sender_name: identity.sender_name,
        timestamp: 0,
        payload: serde_json::to_value(RemoteSkillRun {
            request_id: execution_result.request_id.clone(),
            skill_id: execution_result.skill_id.clone(),
            category: execution_result.category.clone(),
            project_id: execution_result.project_id.clone(),
            target_machine_id: execution_result.target_machine_id.clone(),
            stage: execution_result.stage.clone(),
            current_step: execution_result.current_step.clone(),
            detail: execution_result.detail.clone(),
            success: execution_result.success,
            updated_at: 0,
        })
        .map_err(|error| format!("failed to serialize remote skill result: {error}"))?,
    };

    network_state.broadcast_message(message, None)?;
    Ok(execution_result)
}

#[tauri::command]
fn list_available_tasks(
    task_runner_state: tauri::State<'_, TaskRunnerState>,
) -> Result<Vec<TaskDefinition>, String> {
    Ok(task_runner_state.list_tasks())
}

#[tauri::command]
fn run_task(
    task_runner_state: tauri::State<'_, TaskRunnerState>,
    task_id: String,
) -> Result<TaskRun, String> {
    task_runner_state.run_task(&task_id)
}

#[tauri::command]
fn get_task_runs(
    task_runner_state: tauri::State<'_, TaskRunnerState>,
) -> Result<Vec<TaskRun>, String> {
    task_runner_state.get_runs()
}

#[tauri::command]
fn stop_task_run(
    task_runner_state: tauri::State<'_, TaskRunnerState>,
    run_id: String,
) -> Result<TaskRun, String> {
    task_runner_state.stop_task(&run_id)
}

#[tauri::command]
fn get_task_snapshot(
    task_runner_state: tauri::State<'_, TaskRunnerState>,
) -> Result<TaskStreamSnapshot, String> {
    task_runner_state.get_snapshot()
}

pub fn register(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.invoke_handler(tauri::generate_handler![
        get_system_monitor_snapshot,
        get_codex_status_snapshot,
        start_udp_listener,
        stop_udp_listener,
        broadcast_udp_message,
        send_udp_message,
        get_known_peers,
        get_recent_network_events,
        dequeue_remote_skill_request,
        get_local_udp_identity,
        get_remote_skill_definitions,
        get_remote_skill_profiles,
        get_remote_automation_config,
        get_remote_automation_config_path,
        reveal_remote_automation_config,
        update_remote_automation_config,
        update_remote_skill_profile,
        get_recent_remote_skill_runs,
        run_remote_skill,
        list_available_tasks,
        run_task,
        get_task_runs,
        stop_task_run,
        get_task_snapshot
    ])
}
