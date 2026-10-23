use serde::Serialize;
use tauri::ipc::{Channel, Response};
use tauri::{AppHandle, Emitter, State};

use crate::error::AppResult;
use crate::presets::{self, PresetInfo};
use crate::pty::session::OutputSink;
use crate::pty::shell::{build_plan, which_locate, ShellKind, SpawnSpec};
use crate::pty::{pty_size, PtyManager};

/// Forwards PTY output to the webview as raw bytes (an `ArrayBuffer` in JS).
struct ChannelSink(Channel<Response>);

impl OutputSink for ChannelSink {
    fn send(&self, bytes: &[u8]) -> bool {
        self.0.send(Response::new(bytes.to_vec())).is_ok()
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PtyExitEvent {
    node_id: String,
    exit_code: Option<u32>,
}

#[tauri::command]
pub fn ping() -> String {
    "pong".into()
}

#[tauri::command]
pub async fn pty_spawn(
    app: AppHandle,
    pty: State<'_, PtyManager>,
    node_id: String,
    spec: SpawnSpec,
    cols: u16,
    rows: u16,
    on_data: Channel<Response>,
) -> AppResult<Option<u32>> {
    let plan = build_plan(&node_id, &spec, &which_locate)?;
    let exited_id = node_id.clone();
    pty.spawn(&node_id, plan, pty_size(cols, rows), Box::new(ChannelSink(on_data)), move |exit_code| {
        let _ = app.emit("pty-exit", PtyExitEvent { node_id: exited_id, exit_code });
    })
}

#[tauri::command]
pub async fn pty_attach(pty: State<'_, PtyManager>, node_id: String, on_data: Channel<Response>) -> AppResult<bool> {
    Ok(pty.attach(&node_id, Box::new(ChannelSink(on_data))))
}

#[tauri::command]
pub async fn pty_write(pty: State<'_, PtyManager>, node_id: String, data: String) -> AppResult<()> {
    pty.write(&node_id, data.as_bytes())
}

#[tauri::command]
pub async fn pty_resize(pty: State<'_, PtyManager>, node_id: String, cols: u16, rows: u16) -> AppResult<()> {
    pty.resize(&node_id, pty_size(cols, rows))
}

#[tauri::command]
pub async fn pty_kill(pty: State<'_, PtyManager>, node_id: String) -> AppResult<()> {
    pty.kill(&node_id);
    Ok(())
}

#[tauri::command]
pub async fn pty_list(pty: State<'_, PtyManager>) -> AppResult<Vec<String>> {
    Ok(pty.list())
}

/// Live scrollback only for now; milestone 5 falls back to the copy saved in SQLite.
#[tauri::command]
pub async fn get_scrollback(pty: State<'_, PtyManager>, node_id: String) -> AppResult<Response> {
    Ok(Response::new(pty.scrollback(&node_id).unwrap_or_default()))
}

#[tauri::command]
pub async fn list_presets() -> AppResult<Vec<PresetInfo>> {
    Ok(presets::list_presets(&which_locate))
}

#[tauri::command]
pub async fn list_shells() -> AppResult<Vec<ShellKind>> {
    Ok(presets::list_shells(&which_locate))
}
