mod commands;
mod monitor;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    let builder = window::configure(builder);
    let builder = commands::register(builder);
    let snapshot = monitor::placeholder_snapshot();
    let _ = (snapshot.cpu_load, snapshot.memory_load);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
