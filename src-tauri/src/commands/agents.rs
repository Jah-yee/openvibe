//! Agent activity as the frontend sees it (spec habillage §10.2, §15.3): the
//! hook server, the tracker, the `agent-activity` event and the snapshot.

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::agents::activity::{Activity, Change, HookSource, Tracker, is_keystroke};
use crate::agents::claude_settings;
use crate::agents::hooks_server::{self, HookHit, HookServer};
use crate::error::AppResult;
use crate::pty::shell::{Agent, AgentHooks};

/// Quiet terminals are checked this often (the 1.5 s rule).
const TICK: Duration = Duration::from_millis(250);

pub struct AgentState {
    tracker: Mutex<Tracker>,
    hooks: Option<HookServer>,
    hooks_dir: PathBuf,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    node_id: String,
    activity: Activity,
    since: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivitySnapshot {
    hooks_available: bool,
    activities: Vec<ActivityEvent>,
}

/// Wall-clock milliseconds of `at`, given `now` and the wall clock at `now`:
/// the frontend shows how long an agent has been in its state.
pub fn epoch_ms(at: Instant, now: Instant, wall_now_ms: u64) -> u64 {
    wall_now_ms.saturating_sub(now.saturating_duration_since(at).as_millis() as u64)
}

fn wall_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or(0)
}

fn event(change: &Change) -> ActivityEvent {
    ActivityEvent {
        node_id: change.node_id.clone(),
        activity: change.activity,
        since: epoch_ms(change.since, Instant::now(), wall_ms()),
    }
}

fn emit(app: &AppHandle, change: &Change) {
    let _ = app.emit("agent-activity", event(change));
}

/// Starts the hook server (the app runs without it if it cannot), clears the
/// settings files of the previous run, and checks quiet terminals.
pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let hooks_dir = app.path().app_data_dir()?.join("hooks");
    claude_settings::clear(&hooks_dir);
    let handle = app.clone();
    let hooks = match hooks_server::start(move |hit| on_hook(&handle, hit)) {
        Ok(server) => Some(server),
        Err(err) => {
            eprintln!("hook server not started: {err}");
            None
        }
    };
    app.manage(AgentState {
        tracker: Mutex::new(Tracker::default()),
        hooks,
        hooks_dir,
    });
    let ticker = app.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(TICK);
            let changes = ticker
                .state::<AgentState>()
                .tracker
                .lock()
                .unwrap()
                .tick(Instant::now());
            for change in &changes {
                emit(&ticker, change);
            }
        }
    });
    Ok(())
}

fn on_hook(app: &AppHandle, hit: HookHit) {
    let Some(state) = app.try_state::<AgentState>() else {
        return;
    };
    let change =
        state
            .tracker
            .lock()
            .unwrap()
            .hook(&hit.node_id, hit.source, hit.activity, Instant::now());
    if let Some(change) = change {
        emit(app, &change);
    }
}

/// The hooks a new process gets: Claude's settings file, Codex's notify URL.
/// Without a server, Claude starts without `--settings`.
pub fn hooks_for(app: &AppHandle, node_id: &str, agent: Agent) -> AgentHooks {
    let state = app.state::<AgentState>();
    let Some(server) = &state.hooks else {
        return AgentHooks::default();
    };
    match agent {
        Agent::Claude => match claude_settings::write(
            &state.hooks_dir,
            node_id,
            &server.url(HookSource::Claude, node_id),
        ) {
            Ok(path) => AgentHooks {
                claude_settings: Some(path),
                ..Default::default()
            },
            Err(err) => {
                eprintln!("hooks of {node_id} not written: {err}");
                AgentHooks::default()
            }
        },
        Agent::Codex => AgentHooks {
            codex_notify: Some(server.url(HookSource::Codex, node_id)),
            ..Default::default()
        },
        _ => AgentHooks::default(),
    }
}

/// A process is about to start: idle until it shows otherwise.
pub fn started(app: &AppHandle, node_id: &str) {
    let change = app
        .state::<AgentState>()
        .tracker
        .lock()
        .unwrap()
        .start(node_id, Instant::now());
    emit(app, &change);
}

/// Each chunk of output; emits only when the activity changes.
pub fn output(app: &AppHandle, node_id: &str) {
    let change = app
        .state::<AgentState>()
        .tracker
        .lock()
        .unwrap()
        .output(node_id, Instant::now());
    if let Some(change) = change {
        emit(app, &change);
    }
}

/// What the user typed: an answer hands a hooked agent back to its output.
pub fn input(app: &AppHandle, node_id: &str, data: &[u8]) {
    if !is_keystroke(data) {
        return;
    }
    let change = app
        .state::<AgentState>()
        .tracker
        .lock()
        .unwrap()
        .input(node_id, Instant::now());
    if let Some(change) = change {
        emit(app, &change);
    }
}

/// The process ended (or failed to start): forget it and its settings file.
pub fn ended(app: &AppHandle, node_id: &str) {
    let state = app.state::<AgentState>();
    state.tracker.lock().unwrap().remove(node_id);
    claude_settings::remove(&state.hooks_dir, node_id);
}

#[tauri::command]
pub async fn agent_activity_snapshot(state: State<'_, AgentState>) -> AppResult<ActivitySnapshot> {
    let activities = state
        .tracker
        .lock()
        .unwrap()
        .snapshot()
        .iter()
        .map(event)
        .collect();
    Ok(ActivitySnapshot {
        hooks_available: state.hooks.is_some(),
        activities,
    })
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, Instant};

    use super::*;

    #[test]
    fn dates_a_change_in_wall_clock_milliseconds() {
        let now = Instant::now();
        assert_eq!(
            epoch_ms(now - Duration::from_millis(1500), now, 1_000_000),
            998_500
        );
        assert_eq!(epoch_ms(now, now, 1_000_000), 1_000_000);
    }
}
