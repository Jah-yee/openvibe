use serde::Serialize;
use tauri::ipc::{Channel, Response};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::agents::{self as catalog, AgentInfo};
use crate::commands::agents;
use crate::db::{Db, scrollback};
use crate::error::{AppError, AppResult};
use crate::pty::session::OutputSink;
use crate::pty::shell::{ShellKind, SpawnSpec, build_plan, which_locate};
use crate::pty::{PtyManager, pty_size};

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
pub async fn pty_spawn(
    app: AppHandle,
    pty: State<'_, PtyManager>,
    node_id: String,
    spec: SpawnSpec,
    cols: u16,
    rows: u16,
    on_data: Channel<Response>,
) -> AppResult<Option<u32>> {
    let hooks = agents::hooks_for(&app, &node_id, spec.agent);
    let plan = match build_plan(&node_id, &spec, &which_locate, &hooks) {
        Ok(plan) => plan,
        Err(err) => {
            // The settings file written for this launch has no use any more.
            agents::ended(&app, &node_id);
            return Err(err);
        }
    };
    let exited_id = node_id.clone();
    let output_app = app.clone();
    let output_id = node_id.clone();
    let exit_app = app.clone();
    agents::started(&app, &node_id);
    let spawned = pty.spawn(
        &node_id,
        plan,
        pty_size(cols, rows),
        Box::new(ChannelSink(on_data)),
        Box::new(move || agents::output(&output_app, &output_id)),
        move |info| {
            agents::ended(&exit_app, &exited_id);
            // Saved before the event so a restore right after the exit finds it.
            let saved = exit_app
                .state::<Db>()
                .with(|conn| scrollback::save(conn, &exited_id, &info.scrollback));
            if let Err(err) = saved {
                eprintln!("scrollback of {exited_id} not saved: {err}");
            }
            let _ = exit_app.emit(
                "pty-exit",
                PtyExitEvent {
                    node_id: exited_id,
                    exit_code: info.code,
                },
            );
        },
    );
    if spawned.is_err() {
        agents::ended(&app, &node_id);
    }
    spawned
}

#[tauri::command]
pub async fn pty_attach(
    pty: State<'_, PtyManager>,
    node_id: String,
    on_data: Channel<Response>,
) -> AppResult<bool> {
    Ok(pty.attach(&node_id, Box::new(ChannelSink(on_data))))
}

#[tauri::command]
pub async fn pty_write(pty: State<'_, PtyManager>, node_id: String, data: String) -> AppResult<()> {
    pty.write(&node_id, data.as_bytes())
}

#[tauri::command]
pub async fn pty_resize(
    pty: State<'_, PtyManager>,
    node_id: String,
    cols: u16,
    rows: u16,
) -> AppResult<()> {
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

/// The live scrollback when the terminal runs, otherwise the last copy saved in SQLite.
#[tauri::command]
pub async fn get_scrollback(
    pty: State<'_, PtyManager>,
    db: State<'_, Db>,
    node_id: String,
) -> AppResult<Response> {
    let data = match pty.scrollback(&node_id) {
        Some(live) => live,
        None => db
            .with(|conn| scrollback::load(conn, &node_id))?
            .unwrap_or_default(),
    };
    Ok(Response::new(data))
}

#[tauri::command]
pub async fn list_agents() -> AppResult<Vec<AgentInfo>> {
    Ok(catalog::list_agents(&which_locate))
}

#[tauri::command]
pub async fn list_ollama_models() -> AppResult<Vec<String>> {
    tauri::async_runtime::spawn_blocking(catalog::ollama_models)
        .await
        .map_err(|err| AppError::Io(std::io::Error::other(err.to_string())))?
}

#[tauri::command]
pub async fn list_shells() -> AppResult<Vec<ShellKind>> {
    Ok(catalog::list_shells(&which_locate))
}

/// Writes scrollbacks to SQLite: only the changed ones, or all of them at exit.
pub fn flush_scrollbacks(app: &AppHandle, all: bool) {
    let pty = app.state::<PtyManager>();
    let batch = if all {
        pty.all_scrollbacks()
    } else {
        pty.dirty_scrollbacks()
    };
    let db = app.state::<Db>();
    for (node_id, data) in batch {
        if let Err(err) = db.with(|conn| scrollback::save(conn, &node_id, &data)) {
            eprintln!("scrollback of {node_id} not saved: {err}");
        }
    }
}
