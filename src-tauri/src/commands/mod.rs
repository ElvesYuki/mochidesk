use crate::monitor::{MonitorSnapshot, MonitorState};

#[tauri::command]
fn get_system_monitor_snapshot(
    monitor_state: tauri::State<'_, MonitorState>,
) -> Result<MonitorSnapshot, String> {
    monitor_state
        .snapshot()
        .map_err(std::string::ToString::to_string)
}

pub fn register(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.invoke_handler(tauri::generate_handler![get_system_monitor_snapshot])
}
