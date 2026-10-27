use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

use crate::error::{AppError, AppResult};
use crate::pty::PtyManager;

/// Right before the installer closes OpenVibe (spec première version §6.4):
/// the agents stop and their final output is saved now, the scene and nodes
/// having been saved by the interface. The installer ends the process with
/// `std::process::exit`, so the app's own exit handling never runs.
#[tauri::command]
pub async fn prepare_for_update(app: AppHandle) {
    log::info!("installing an update");
    if !app.state::<PtyManager>().stop_all(UPDATE_STOP_TIMEOUT) {
        log::warn!("some terminals were still exiting when the update started");
    }
    crate::commands::pty::flush_scrollbacks(&app, true);
}

/// How long the agents get to stop before the installer runs.
const UPDATE_STOP_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(5);

/// Opens the folder of the log file, to send it with a bug report (spec première version §3.6).
#[tauri::command]
pub fn open_log_dir(app: AppHandle) -> AppResult<()> {
    let dir = app.path().app_log_dir().map_err(|err| {
        AppError::NotFound(crate::tr!(
            "Dossier des journaux introuvable : {err}",
            "Logs folder not found: {err}"
        ))
    })?;
    std::fs::create_dir_all(&dir)?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|err| AppError::Io(std::io::Error::other(err.to_string())))
}
