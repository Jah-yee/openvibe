use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

use crate::error::{AppError, AppResult};

/// Right before the installer closes OpenVibe (spec première version §6.4):
/// every terminal's history is written now, the scene and nodes having been
/// saved by the interface.
#[tauri::command]
pub fn prepare_for_update(app: AppHandle) {
    log::info!("installing an update");
    crate::commands::pty::flush_scrollbacks(&app, true);
}

/// Opens the folder of the log file, to send it with a bug report (spec première version §3.6).
#[tauri::command]
pub fn open_log_dir(app: AppHandle) -> AppResult<()> {
    let dir = app
        .path()
        .app_log_dir()
        .map_err(|err| AppError::NotFound(format!("dossier des journaux introuvable : {err}")))?;
    std::fs::create_dir_all(&dir)?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|err| AppError::Io(std::io::Error::other(err.to_string())))
}
