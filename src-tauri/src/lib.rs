mod commands;
mod monitor;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().manage(monitor::MonitorState::new());
    let builder = window::configure(builder);
    let builder = commands::register(builder);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
