use tauri::Manager;

mod automation_config;
mod commands;
mod monitor;
mod network;
mod remote_skill;
mod task_runner;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().setup(|app| {
        let automation_config_state = automation_config::AutomationConfigState::new(app.handle());
        let automation_config = automation_config_state
            .snapshot()
            .unwrap_or_else(|_| automation_config::default_config());

        app.manage(monitor::MonitorState::new());
        app.manage(monitor::CodexMonitorState::new());
        app.manage(network::NetworkState::new());
        app.manage(automation_config_state);
        app.manage(remote_skill::RemoteSkillState::new(automation_config.profiles));
        app.manage(task_runner::TaskRunnerState::new());
        Ok(())
    });
    let builder = window::configure(builder);
    let builder = commands::register(builder);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
