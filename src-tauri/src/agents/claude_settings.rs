//! The settings file given to Claude with `--settings` (spec habillage §8.2,
//! §10.3): http hooks that report its state, none that could block a decision.

use std::io;
use std::path::{Path, PathBuf};

use serde_json::{Value, json};

use super::hooks_server::valid_node_id;

const NOTIFICATIONS: &str =
    "permission_prompt|elicitation_dialog|elicitation_url_dialog|agent_needs_input|idle_prompt";

pub fn settings_json(url: &str) -> Value {
    let hook = json!({ "type": "http", "url": url, "timeout": 2 });
    let every = json!([{ "hooks": [hook] }]);
    json!({
        "hooks": {
            "UserPromptSubmit": every,
            "PostToolUse": every,
            "Stop": every,
            "StopFailure": every,
            "SessionEnd": every,
            "Notification": [{ "matcher": NOTIFICATIONS, "hooks": [hook] }],
        }
    })
}

/// `<dir>/<nodeId>.json`, rewritten at each launch (port and token change
/// with each run of the app).
pub fn write(dir: &Path, node_id: &str, url: &str) -> io::Result<PathBuf> {
    if !valid_node_id(node_id) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("identifiant de nœud invalide : {node_id}"),
        ));
    }
    std::fs::create_dir_all(dir)?;
    let path = dir.join(format!("{node_id}.json"));
    std::fs::write(&path, serde_json::to_vec_pretty(&settings_json(url))?)?;
    Ok(path)
}

pub fn remove(dir: &Path, node_id: &str) {
    if valid_node_id(node_id) {
        let _ = std::fs::remove_file(dir.join(format!("{node_id}.json")));
    }
}

/// Files left by a previous run point at a server that is gone.
pub fn clear(dir: &Path) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            let _ = std::fs::remove_file(path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const URL: &str = "http://127.0.0.1:4242/hook/claude/n1?t=tok";

    #[test]
    fn reports_the_tracked_events_to_the_url_without_blocking_hooks() {
        let json = settings_json(URL);
        let hooks = json["hooks"].as_object().unwrap();
        let mut events: Vec<_> = hooks.keys().map(String::as_str).collect();
        events.sort_unstable();
        assert_eq!(
            events,
            [
                "Notification",
                "PostToolUse",
                "SessionEnd",
                "Stop",
                "StopFailure",
                "UserPromptSubmit"
            ]
        );
        assert_eq!(
            json["hooks"]["Stop"][0]["hooks"][0],
            serde_json::json!({ "type": "http", "url": URL, "timeout": 2 })
        );
        assert_eq!(
            json["hooks"]["Notification"][0]["matcher"],
            "permission_prompt|elicitation_dialog|elicitation_url_dialog|agent_needs_input|idle_prompt"
        );
    }

    #[test]
    fn writes_rewrites_and_removes_a_terminal_s_file() {
        let dir = tempfile::tempdir().unwrap();
        let hooks = dir.path().join("hooks");
        let path = write(&hooks, "n1", URL).unwrap();
        assert_eq!(path, hooks.join("n1.json"));
        let read: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        assert_eq!(read, settings_json(URL));
        write(&hooks, "n1", "http://127.0.0.1:1/other").unwrap();
        assert!(
            std::fs::read_to_string(&path)
                .unwrap()
                .contains("127.0.0.1:1/other")
        );
        remove(&hooks, "n1");
        assert!(!path.exists());
    }

    #[test]
    fn refuses_a_node_id_that_would_leave_the_folder() {
        let dir = tempfile::tempdir().unwrap();
        assert!(write(dir.path(), "../evil", URL).is_err());
        assert!(!dir.path().join("../evil.json").exists());
    }

    #[test]
    fn clears_the_files_of_the_previous_run() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "a", URL).unwrap();
        write(dir.path(), "b", URL).unwrap();
        std::fs::write(dir.path().join("keep.txt"), "x").unwrap();
        clear(dir.path());
        let left: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .map(|e| e.unwrap().file_name())
            .collect();
        assert_eq!(left, vec![std::ffi::OsString::from("keep.txt")]);
        clear(&dir.path().join("missing"));
    }
}
