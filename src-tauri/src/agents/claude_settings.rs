//! The settings file given to Claude with `--settings` (spec habillage §8.2,
//! §10.3): http hooks that report its state, none that could block a decision.

use std::io;
use std::path::{Path, PathBuf};

use serde_json::{Value, json};

use super::hooks_server::valid_node_id;
use crate::pty::shell::Role;

const NOTIFICATIONS: &str =
    "permission_prompt|elicitation_dialog|elicitation_url_dialog|agent_needs_input|idle_prompt";

pub fn settings_json(url: &str, role: Role) -> Value {
    let hook = json!({ "type": "http", "url": url, "timeout": 2 });
    let every = json!([{ "hooks": [hook] }]);
    // OpenVibe's own tools never ask (spec orchestrateur §4.2).
    let mut permissions = json!({ "allow": ["mcp__openvibe"] });
    if role == Role::Orchestrator {
        // A manager does not code itself.
        permissions["deny"] = json!(["Edit", "Write", "NotebookEdit"]);
    }
    json!({
        "hooks": {
            "UserPromptSubmit": every,
            "PostToolUse": every,
            "Stop": every,
            "StopFailure": every,
            "SessionEnd": every,
            "SubagentStart": every,
            "SubagentStop": every,
            "Notification": [{ "matcher": NOTIFICATIONS, "hooks": [hook] }],
        },
        "permissions": permissions,
    })
}

/// The status line OpenVibe gives Claude (spec maj §6): the session's usage
/// posted to OpenVibe, then the user's own status line, shown as before.
#[derive(Debug, Clone, PartialEq)]
pub struct StatusLine {
    pub script: PathBuf,
    pub url: String,
    /// The user's `statusLine` setting, when it runs a command.
    pub user: Option<Value>,
}

/// Run by Claude through bash, Git Bash on Windows: `$1` is OpenVibe's URL,
/// `$2` the user's own status line command, given the same JSON.
pub const STATUS_SCRIPT: &str = "#!/usr/bin/env bash\n\
# OpenVibe : la ligne d'état de Claude transmet l'usage de la session, puis affiche celle de l'utilisateur.\n\
input=$(cat)\n\
printf '%s' \"$input\" | curl -s -m 1 -X POST -H 'Content-Type: application/json' --data-binary @- \"$1\" >/dev/null 2>&1\n\
if [ -n \"${2:-}\" ]; then printf '%s' \"$input\" | bash -c \"$2\"; fi\n";

/// A word for bash: single quotes, a quote inside closed and reopened.
fn bash_quote(text: &str) -> String {
    format!("'{}'", text.replace('\'', r"'\''"))
}

pub fn status_line_json(status: &StatusLine) -> Value {
    // bash reads Windows paths with forward slashes.
    let script = status.script.to_string_lossy().replace('\\', "/");
    let mut command = format!("bash {} {}", bash_quote(&script), bash_quote(&status.url));
    let user = status.user.as_ref();
    if let Some(own) = user.and_then(|u| u["command"].as_str()) {
        command.push(' ');
        command.push_str(&bash_quote(own));
    }
    let mut line = json!({ "type": "command", "command": command });
    for key in ["padding", "refreshInterval"] {
        if let Some(value) = user.and_then(|u| u.get(key)) {
            line[key] = value.clone();
        }
    }
    line
}

/// The `statusLine` of Claude's user settings when it runs a command.
pub fn user_status_line(settings: &Path) -> Option<Value> {
    let read: Value = serde_json::from_slice(&std::fs::read(settings).ok()?).ok()?;
    let line = read.get("statusLine")?;
    let runs = line["type"] == "command"
        && line["command"]
            .as_str()
            .is_some_and(|c| !c.trim().is_empty());
    runs.then(|| line.clone())
}

/// Claude's user settings: `$CLAUDE_CONFIG_DIR/settings.json`, else `~/.claude/settings.json`.
pub fn user_settings_file() -> Option<PathBuf> {
    if let Some(dir) = std::env::var_os("CLAUDE_CONFIG_DIR") {
        return Some(PathBuf::from(dir).join("settings.json"));
    }
    let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME"))?;
    Some(PathBuf::from(home).join(".claude").join("settings.json"))
}

/// `<dir>/<nodeId>.json`, rewritten at each launch (port and token change
/// with each run of the app).
pub fn write(
    dir: &Path,
    node_id: &str,
    url: &str,
    role: Role,
    status: Option<&StatusLine>,
) -> io::Result<PathBuf> {
    if !valid_node_id(node_id) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("identifiant de nœud invalide : {node_id}"),
        ));
    }
    std::fs::create_dir_all(dir)?;
    let path = dir.join(format!("{node_id}.json"));
    let mut settings = settings_json(url, role);
    if let Some(status) = status {
        std::fs::write(&status.script, STATUS_SCRIPT)?;
        settings["statusLine"] = status_line_json(status);
    }
    std::fs::write(&path, serde_json::to_vec_pretty(&settings)?)?;
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
        let json = settings_json(URL, Role::Agent);
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
                "SubagentStart",
                "SubagentStop",
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
    fn allows_openvibe_s_tools_without_asking() {
        assert_eq!(
            settings_json(URL, Role::Agent)["permissions"],
            serde_json::json!({ "allow": ["mcp__openvibe"] })
        );
    }

    #[test]
    fn writes_rewrites_and_removes_a_terminal_s_file() {
        let dir = tempfile::tempdir().unwrap();
        let hooks = dir.path().join("hooks");
        let path = write(&hooks, "n1", URL, Role::Agent, None).unwrap();
        assert_eq!(path, hooks.join("n1.json"));
        let read: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        assert_eq!(read, settings_json(URL, Role::Agent));
        write(&hooks, "n1", "http://127.0.0.1:1/other", Role::Agent, None).unwrap();
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
        assert!(write(dir.path(), "../evil", URL, Role::Agent, None).is_err());
        assert!(!dir.path().join("../evil.json").exists());
    }

    #[test]
    fn clears_the_files_of_the_previous_run() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "a", URL, Role::Agent, None).unwrap();
        write(dir.path(), "b", URL, Role::Agent, None).unwrap();
        std::fs::write(dir.path().join("keep.txt"), "x").unwrap();
        clear(dir.path());
        let left: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .map(|e| e.unwrap().file_name())
            .collect();
        assert_eq!(left, vec![std::ffi::OsString::from("keep.txt")]);
        clear(&dir.path().join("missing"));
    }

    const STATUS_URL: &str = "http://127.0.0.1:4242/status/n1?t=tok";

    fn status(user: Option<serde_json::Value>) -> StatusLine {
        StatusLine {
            script: PathBuf::from(r"C:\data\hooks\statusline.sh"),
            url: STATUS_URL.into(),
            user,
        }
    }

    #[test]
    fn its_status_line_tells_openvibe_then_shows_the_user_s_own() {
        assert_eq!(
            status_line_json(&status(None)),
            json!({ "type": "command", "command": format!("bash 'C:/data/hooks/statusline.sh' '{STATUS_URL}'") })
        );
        let user = json!({ "type": "command", "command": "~/bin/it's.sh --x", "padding": 0, "refreshInterval": 5 });
        assert_eq!(
            status_line_json(&status(Some(user))),
            json!({
                "type": "command",
                "command": format!("bash 'C:/data/hooks/statusline.sh' '{STATUS_URL}' '~/bin/it'\\''s.sh --x'"),
                "padding": 0,
                "refreshInterval": 5
            })
        );
    }

    #[test]
    fn reads_the_user_s_status_line_from_claude_s_settings() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("settings.json");
        assert_eq!(user_status_line(&file), None);
        std::fs::write(
            &file,
            r#"{ "statusLine": { "type": "command", "command": "carbon.sh" }, "x": 1 }"#,
        )
        .unwrap();
        assert_eq!(
            user_status_line(&file),
            Some(json!({ "type": "command", "command": "carbon.sh" }))
        );
        std::fs::write(
            &file,
            r#"{ "statusLine": { "type": "static", "command": "x" } }"#,
        )
        .unwrap();
        assert_eq!(user_status_line(&file), None);
        std::fs::write(&file, "pas du json").unwrap();
        assert_eq!(user_status_line(&file), None);
    }

    #[test]
    fn writes_the_status_line_and_its_script() {
        let dir = tempfile::tempdir().unwrap();
        let line = StatusLine {
            script: dir.path().join("statusline.sh"),
            url: STATUS_URL.into(),
            user: None,
        };
        let path = write(dir.path(), "n1", URL, Role::Agent, Some(&line)).unwrap();
        let read: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        assert_eq!(read["statusLine"], status_line_json(&line));
        let script = std::fs::read_to_string(dir.path().join("statusline.sh")).unwrap();
        assert!(
            script.contains("curl")
                && script.contains("\"$1\"")
                && script.contains("bash -c \"$2\""),
            "{script}"
        );
        assert!(!script.contains('\r'), "bash needs LF line ends");
    }

    #[test]
    fn an_orchestrator_may_not_edit_files() {
        let manager = settings_json(URL, Role::Orchestrator);
        assert_eq!(manager["permissions"]["allow"], json!(["mcp__openvibe"]));
        assert_eq!(
            manager["permissions"]["deny"],
            json!(["Edit", "Write", "NotebookEdit"])
        );
        assert!(
            settings_json(URL, Role::Agent)["permissions"]
                .get("deny")
                .is_none()
        );
    }
}
