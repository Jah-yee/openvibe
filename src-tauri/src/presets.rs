use serde::Serialize;

use crate::pty::shell::{find_git_bash, Locate, Preset, ShellKind};

/// Availability of a launch preset; labels live in the frontend.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetInfo {
    pub id: Preset,
    pub available: bool,
}

pub fn list_presets(locate: Locate) -> Vec<PresetInfo> {
    let on_path = |name: &str| locate(name).is_some();
    vec![
        PresetInfo { id: Preset::Claude, available: on_path("claude") },
        PresetInfo { id: Preset::Aider, available: on_path("aider") },
        PresetInfo { id: Preset::Codex, available: on_path("codex") },
        PresetInfo { id: Preset::Shell, available: true },
        PresetInfo { id: Preset::Custom, available: true },
    ]
}

/// Shells that can actually be started on this machine, default first.
pub fn list_shells(locate: Locate) -> Vec<ShellKind> {
    let mut shells = if cfg!(windows) {
        vec![ShellKind::PowerShell, ShellKind::Cmd]
    } else {
        vec![ShellKind::Default]
    };
    if locate("pwsh").is_some() {
        shells.push(ShellKind::Pwsh);
    }
    if cfg!(windows) && locate("git").and_then(|git| find_git_bash(&git)).is_some() {
        shells.push(ShellKind::GitBash);
    }
    shells
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;

    #[test]
    fn marks_agents_available_only_when_found_on_path() {
        let locate = |name: &str| (name == "claude").then(|| PathBuf::from("C:/npm/claude.cmd"));
        let presets = list_presets(&locate);
        let available: Vec<_> = presets.iter().filter(|p| p.available).map(|p| p.id).collect();
        assert_eq!(available, vec![Preset::Claude, Preset::Shell, Preset::Custom]);
    }

    #[test]
    fn serializes_preset_ids_in_lowercase() {
        let json = serde_json::to_value(PresetInfo { id: Preset::Claude, available: true }).unwrap();
        assert_eq!(json, serde_json::json!({ "id": "claude", "available": true }));
    }

    #[cfg(windows)]
    #[test]
    fn lists_builtin_windows_shells_and_optional_pwsh() {
        assert_eq!(list_shells(&|_| None), vec![ShellKind::PowerShell, ShellKind::Cmd]);
        let with_pwsh = list_shells(&|name: &str| (name == "pwsh").then(|| PathBuf::from("C:/pwsh.exe")));
        assert_eq!(with_pwsh, vec![ShellKind::PowerShell, ShellKind::Cmd, ShellKind::Pwsh]);
    }
}
