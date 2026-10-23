mod commands;
mod db;
mod error;
mod presets;
mod pty;

use tauri::Manager;

use pty::PtyManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PtyManager::default())
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::pty_spawn,
            commands::pty_attach,
            commands::pty_write,
            commands::pty_resize,
            commands::pty_kill,
            commands::pty_list,
            commands::get_scrollback,
            commands::list_presets,
            commands::list_shells,
        ])
        .build(tauri::generate_context!())
        .expect("error while building the OpenVibe application");

    app.run(|handle, event| {
        // Agents must not outlive the window that shows them.
        if let tauri::RunEvent::Exit = event {
            handle.state::<PtyManager>().kill_all();
        }
    });
}
