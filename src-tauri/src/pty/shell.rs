use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShellKind {
    Default,
    PowerShell,
    Pwsh,
    Cmd,
    GitBash,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Preset {
    Claude,
    Aider,
    Codex,
    Shell,
    Custom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ClaudeMode {
    New,
    Resume,
    Continue,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeLaunch {
    pub mode: ClaudeMode,
    pub session_id: String,
    pub title: String,
}

/// What the frontend asks for when it starts a terminal (spec §9).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnSpec {
    pub cwd: String,
    pub shell: ShellKind,
    pub preset: Preset,
    #[serde(default)]
    pub command: String,
    pub claude: Option<ClaudeLaunch>,
}

/// Quoting rules differ per shell, so each resolved shell carries its syntax.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShellSyntax {
    PowerShell,
    Cmd,
    Posix,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShellProgram {
    pub program: PathBuf,
    pub args: Vec<String>,
    pub syntax: ShellSyntax,
}

/// Everything needed to start a process in a PTY, independent of Tauri.
#[derive(Debug, Clone)]
pub struct SpawnPlan {
    pub program: PathBuf,
    pub args: Vec<String>,
    pub cwd: PathBuf,
    pub env: Vec<(String, String)>,
    /// Typed into the shell right after it starts, e.g. `claude --resume <id>\r`.
    pub initial_input: Option<String>,
}

/// Finds an executable on PATH. Injected so tests don't depend on the machine.
pub type Locate<'a> = &'a dyn Fn(&str) -> Option<PathBuf>;

pub fn which_locate(name: &str) -> Option<PathBuf> {
    which::which(name).ok()
}

pub fn resolve_shell(kind: ShellKind, locate: Locate) -> AppResult<ShellProgram> {
    let program = |name: &str, fallback: &str, args: &[&str], syntax| ShellProgram {
        program: locate(name).unwrap_or_else(|| PathBuf::from(fallback)),
        args: args.iter().map(|a| a.to_string()).collect(),
        syntax,
    };
    match kind {
        ShellKind::Default if cfg!(windows) => resolve_shell(ShellKind::PowerShell, locate),
        ShellKind::Default => Ok(ShellProgram {
            program: std::env::var("SHELL")
                .unwrap_or_else(|_| "/bin/bash".into())
                .into(),
            args: vec!["-l".into()],
            syntax: ShellSyntax::Posix,
        }),
        ShellKind::PowerShell => Ok(program(
            "powershell",
            "powershell.exe",
            &["-NoLogo"],
            ShellSyntax::PowerShell,
        )),
        ShellKind::Cmd => Ok(program("cmd", "cmd.exe", &[], ShellSyntax::Cmd)),
        ShellKind::Pwsh => locate("pwsh")
            .map(|p| ShellProgram {
                program: p,
                args: vec!["-NoLogo".into()],
                syntax: ShellSyntax::PowerShell,
            })
            .ok_or_else(|| AppError::NotFound("pwsh introuvable dans le PATH".into())),
        ShellKind::GitBash => locate("git")
            .and_then(|git| find_git_bash(&git))
            .map(|p| ShellProgram {
                program: p,
                args: vec!["--login".into(), "-i".into()],
                syntax: ShellSyntax::Posix,
            })
            .ok_or_else(|| AppError::NotFound("Git Bash introuvable".into())),
    }
}

/// Git for Windows ships `bin\bash.exe` at its root, while `git.exe` lives in `cmd\`
/// or `mingw64\bin\`. Walking up from git avoids picking WSL's `bash.exe` from PATH.
pub fn find_git_bash(git: &Path) -> Option<PathBuf> {
    git.ancestors()
        .skip(1)
        .take(4)
        .map(|dir| dir.join("bin").join("bash.exe"))
        .find(|candidate| candidate.is_file())
}

/// Quotes one argument for the given shell's interactive syntax.
pub fn quote(syntax: ShellSyntax, value: &str) -> String {
    match syntax {
        // PowerShell also treats typographic single quotes as quote characters.
        ShellSyntax::PowerShell => {
            let mut out = String::from("'");
            for c in value.chars() {
                if matches!(c, '\'' | '\u{2018}' | '\u{2019}' | '\u{201A}' | '\u{201B}') {
                    out.push(c);
                }
                out.push(c);
            }
            out.push('\'');
            out
        }
        ShellSyntax::Posix => format!("'{}'", value.replace('\'', r"'\''")),
        // cmd has no reliable escape for `%` and `!` inside quotes, so we drop the
        // characters cmd would interpret rather than risk variable expansion.
        ShellSyntax::Cmd => {
            let safe: String = value
                .chars()
                .filter(|c| !matches!(c, '"' | '%' | '!' | '^'))
                .collect();
            format!("\"{safe}\"")
        }
    }
}

/// The command typed into the shell for a preset, or `None` for a plain shell.
pub fn preset_command(spec: &SpawnSpec, syntax: ShellSyntax) -> AppResult<Option<String>> {
    Ok(match spec.preset {
        Preset::Shell => None,
        Preset::Aider => Some("aider".into()),
        Preset::Codex => Some("codex".into()),
        Preset::Custom => {
            let command = spec.command.trim();
            if command.is_empty() {
                return Err(AppError::InvalidInput(
                    "la commande personnalisée est vide".into(),
                ));
            }
            Some(command.to_string())
        }
        Preset::Claude => Some(claude_command(spec.claude.as_ref(), syntax)?),
    })
}

fn claude_command(launch: Option<&ClaudeLaunch>, syntax: ShellSyntax) -> AppResult<String> {
    let launch =
        launch.ok_or_else(|| AppError::InvalidInput("options Claude manquantes".into()))?;
    if launch.mode == ClaudeMode::Continue {
        return Ok("claude --continue".into());
    }
    // Parsing guarantees the id is a bare UUID, so it never needs quoting.
    let session = uuid::Uuid::parse_str(&launch.session_id).map_err(|_| {
        AppError::InvalidInput(format!(
            "identifiant de session invalide : {}",
            launch.session_id
        ))
    })?;
    let title = clean_title(&launch.title);
    Ok(match launch.mode {
        ClaudeMode::Resume => format!("claude --resume {session}"),
        _ if title.is_empty() => format!("claude --session-id {session}"),
        // Git Bash rewrites arguments that look like paths ("/fix" → "C:/Program Files/Git/fix").
        _ if syntax == ShellSyntax::Posix => {
            format!(
                "MSYS_NO_PATHCONV=1 claude --session-id {session} -n {}",
                quote(syntax, &title)
            )
        }
        _ => format!("claude --session-id {session} -n {}", quote(syntax, &title)),
    })
}

/// Titles are typed into an interactive shell: control characters would submit or
/// cancel the line, PowerShell 5.1 drops embedded `"` before calling a native
/// program, and a trailing `\` escapes the closing quote in cmd and PowerShell.
fn clean_title(title: &str) -> String {
    let kept: String = title
        .chars()
        .filter(|c| !c.is_control() && *c != '"')
        .collect();
    kept.trim().trim_end_matches('\\').trim_end().to_string()
}

pub fn build_plan(node_id: &str, spec: &SpawnSpec, locate: Locate) -> AppResult<SpawnPlan> {
    let cwd = PathBuf::from(&spec.cwd);
    if !cwd.is_dir() {
        return Err(AppError::NotFound(format!(
            "dossier introuvable : {}",
            spec.cwd
        )));
    }
    let shell = resolve_shell(spec.shell, locate)?;
    let initial_input = preset_command(spec, shell.syntax)?.map(|command| format!("{command}\r"));
    Ok(SpawnPlan {
        program: shell.program,
        args: shell.args,
        cwd,
        env: vec![
            ("TERM".into(), "xterm-256color".into()),
            ("COLORTERM".into(), "truecolor".into()),
            ("OPENVIBE".into(), "1".into()),
            ("OPENVIBE_NODE_ID".into(), node_id.into()),
        ],
        initial_input,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const SESSION: &str = "0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10";

    fn nothing_on_path(_: &str) -> Option<PathBuf> {
        None
    }

    fn spec(preset: Preset, claude: Option<ClaudeLaunch>) -> SpawnSpec {
        SpawnSpec {
            cwd: std::env::temp_dir().to_string_lossy().into_owned(),
            shell: ShellKind::Cmd,
            preset,
            command: String::new(),
            claude,
        }
    }

    fn claude(mode: ClaudeMode, title: &str) -> Option<ClaudeLaunch> {
        Some(ClaudeLaunch {
            mode,
            session_id: SESSION.into(),
            title: title.into(),
        })
    }

    #[test]
    fn quotes_for_powershell_doubling_all_single_quote_variants() {
        assert_eq!(quote(ShellSyntax::PowerShell, "it's"), "'it''s'");
        assert_eq!(
            quote(ShellSyntax::PowerShell, "l\u{2019}api"),
            "'l\u{2019}\u{2019}api'"
        );
        assert_eq!(quote(ShellSyntax::PowerShell, "$env:PATH"), "'$env:PATH'");
    }

    #[test]
    fn quotes_for_posix_shells() {
        assert_eq!(quote(ShellSyntax::Posix, "it's"), r"'it'\''s'");
    }

    #[test]
    fn quotes_for_cmd_by_dropping_expansion_characters() {
        assert_eq!(quote(ShellSyntax::Cmd, "50% \"done\"!"), "\"50 done\"");
    }

    #[test]
    fn new_claude_session_passes_id_and_title() {
        let cmd = preset_command(
            &spec(Preset::Claude, claude(ClaudeMode::New, "Mon agent")),
            ShellSyntax::PowerShell,
        )
        .unwrap();
        assert_eq!(
            cmd.as_deref(),
            Some("claude --session-id 0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10 -n 'Mon agent'")
        );
    }

    #[test]
    fn new_claude_session_without_title_omits_name() {
        let cmd = preset_command(
            &spec(Preset::Claude, claude(ClaudeMode::New, "  ")),
            ShellSyntax::Posix,
        )
        .unwrap();
        assert_eq!(
            cmd.as_deref(),
            Some("claude --session-id 0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10")
        );
    }

    #[test]
    fn strips_control_characters_from_the_title() {
        // A carriage return would submit the line early and run the rest as a command.
        let cmd = preset_command(
            &spec(Preset::Claude, claude(ClaudeMode::New, "Fix\r del *\x03")),
            ShellSyntax::Cmd,
        )
        .unwrap();
        assert_eq!(
            cmd.as_deref(),
            Some("claude --session-id 0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10 -n \"Fix del *\"")
        );
    }

    #[test]
    fn drops_double_quotes_and_trailing_backslashes_from_the_title() {
        let cmd = preset_command(
            &spec(
                Preset::Claude,
                claude(ClaudeMode::New, "Fix \"login\" page\\"),
            ),
            ShellSyntax::PowerShell,
        )
        .unwrap();
        assert_eq!(
            cmd.as_deref(),
            Some("claude --session-id 0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10 -n 'Fix login page'")
        );
    }

    #[test]
    fn disables_msys_path_conversion_for_posix_titles() {
        // Git Bash would otherwise turn "/fix login" into "C:/Program Files/Git/fix login".
        let cmd = preset_command(
            &spec(Preset::Claude, claude(ClaudeMode::New, "/fix login")),
            ShellSyntax::Posix,
        )
        .unwrap();
        assert_eq!(
            cmd.as_deref(),
            Some(
                "MSYS_NO_PATHCONV=1 claude --session-id 0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10 -n '/fix login'"
            )
        );
    }

    #[test]
    fn a_title_of_only_control_characters_omits_the_name() {
        let cmd = preset_command(
            &spec(Preset::Claude, claude(ClaudeMode::New, "\r\n\t")),
            ShellSyntax::PowerShell,
        )
        .unwrap();
        assert_eq!(
            cmd.as_deref(),
            Some("claude --session-id 0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10")
        );
    }

    #[test]
    fn resume_and_continue_modes() {
        let resume = preset_command(
            &spec(Preset::Claude, claude(ClaudeMode::Resume, "x")),
            ShellSyntax::Cmd,
        )
        .unwrap();
        assert_eq!(
            resume.as_deref(),
            Some("claude --resume 0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10")
        );
        let cont = preset_command(
            &spec(Preset::Claude, claude(ClaudeMode::Continue, "x")),
            ShellSyntax::Cmd,
        )
        .unwrap();
        assert_eq!(cont.as_deref(), Some("claude --continue"));
    }

    #[test]
    fn rejects_a_session_id_that_is_not_a_uuid() {
        let launch = Some(ClaudeLaunch {
            mode: ClaudeMode::Resume,
            session_id: "x; rm -rf /".into(),
            title: String::new(),
        });
        let err = preset_command(&spec(Preset::Claude, launch), ShellSyntax::Posix).unwrap_err();
        assert_eq!(err.kind(), "invalidInput");
    }

    #[test]
    fn custom_preset_requires_a_command() {
        let mut s = spec(Preset::Custom, None);
        assert_eq!(
            preset_command(&s, ShellSyntax::Cmd).unwrap_err().kind(),
            "invalidInput"
        );
        s.command = "  npm run dev ".into();
        assert_eq!(
            preset_command(&s, ShellSyntax::Cmd).unwrap().as_deref(),
            Some("npm run dev")
        );
    }

    #[test]
    fn shell_preset_types_nothing() {
        assert_eq!(
            preset_command(&spec(Preset::Shell, None), ShellSyntax::Cmd).unwrap(),
            None
        );
    }

    #[test]
    fn plan_types_command_with_carriage_return_and_sets_env() {
        let plan = build_plan("node-1", &spec(Preset::Aider, None), &nothing_on_path).unwrap();
        assert_eq!(plan.program, PathBuf::from("cmd.exe"));
        assert_eq!(plan.initial_input.as_deref(), Some("aider\r"));
        assert!(
            plan.env
                .contains(&("OPENVIBE_NODE_ID".into(), "node-1".into()))
        );
        assert!(plan.env.contains(&("TERM".into(), "xterm-256color".into())));
    }

    #[test]
    fn plan_rejects_missing_working_directory() {
        let mut s = spec(Preset::Shell, None);
        s.cwd = "Z:/definitely/not/here".into();
        assert_eq!(
            build_plan("n", &s, &nothing_on_path).unwrap_err().kind(),
            "notFound"
        );
    }

    #[test]
    fn pwsh_must_be_on_path() {
        assert_eq!(
            resolve_shell(ShellKind::Pwsh, &nothing_on_path)
                .unwrap_err()
                .kind(),
            "notFound"
        );
        let found = resolve_shell(ShellKind::Pwsh, &|_| {
            Some(PathBuf::from("C:/pwsh/pwsh.exe"))
        })
        .unwrap();
        assert_eq!(found.syntax, ShellSyntax::PowerShell);
        assert_eq!(found.args, vec!["-NoLogo".to_string()]);
    }

    #[test]
    fn finds_git_bash_from_either_git_location() {
        let root = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(root.path().join("bin")).unwrap();
        std::fs::write(root.path().join("bin").join("bash.exe"), b"").unwrap();
        let expected = Some(root.path().join("bin").join("bash.exe"));
        assert_eq!(
            find_git_bash(&root.path().join("cmd").join("git.exe")),
            expected
        );
        assert_eq!(
            find_git_bash(&root.path().join("mingw64").join("bin").join("git.exe")),
            expected
        );
        assert_eq!(find_git_bash(Path::new("C:/nowhere/git.exe")), None);
    }

    #[test]
    fn deserializes_spawn_spec_from_frontend_json() {
        let json = serde_json::json!({
            "cwd": "C:/code", "shell": "gitbash", "preset": "claude", "command": "",
            "claude": { "mode": "resume", "sessionId": SESSION, "title": "t" }
        });
        let s: SpawnSpec = serde_json::from_value(json).unwrap();
        assert_eq!(s.shell, ShellKind::GitBash);
        assert_eq!(s.claude.unwrap().mode, ClaudeMode::Resume);
    }
}
