use std::path::Path;
use std::process::Command;

use serde::Serialize;

use crate::process::hide_window;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub changed: u32,
}

/// Reads `git status --porcelain=v1 -b`: the first line names the branch, every
/// other line is one changed path.
pub fn parse_status(output: &str) -> GitStatus {
    let mut lines = output.lines();
    let header = lines.next().unwrap_or("").trim_start_matches("## ");
    let branch = if let Some(rest) = header.strip_prefix("No commits yet on ") {
        rest
    } else if let Some(rest) = header.strip_prefix("Initial commit on ") {
        rest
    } else if header.starts_with("HEAD (no branch)") {
        "HEAD"
    } else {
        header
            .split("...")
            .next()
            .unwrap_or(header)
            .split(' ')
            .next()
            .unwrap_or("")
    };
    let changed = lines.filter(|line| !line.trim().is_empty()).count() as u32;
    GitStatus {
        branch: branch.to_string(),
        changed,
    }
}

/// None when `path` is not inside a git repository or git is not installed.
pub fn status(path: &Path) -> Option<GitStatus> {
    let output = hide_window(Command::new("git").arg("-C").arg(path).args([
        "status",
        "--porcelain=v1",
        "-b",
        "--untracked-files=normal",
    ]))
    .output()
    .ok()?;
    if !output.status.success() {
        return None;
    }
    Some(parse_status(&String::from_utf8_lossy(&output.stdout)))
}

#[cfg(test)]
mod tests {
    use std::process::Command;

    use super::*;

    #[test]
    fn reads_the_branch_and_counts_changed_paths() {
        let status = parse_status("## main...origin/main [ahead 1]\n M src/a.ts\n?? b.txt\n");
        assert_eq!(
            status,
            GitStatus {
                branch: "main".into(),
                changed: 2
            }
        );
        assert_eq!(parse_status("## feat/x\n").branch, "feat/x");
        assert_eq!(parse_status("## No commits yet on main\n").branch, "main");
        assert_eq!(parse_status("## HEAD (no branch)\n").branch, "HEAD");
        assert_eq!(parse_status("").changed, 0);
    }

    #[test]
    fn is_none_outside_a_repository() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(status(dir.path()), None);
    }

    #[test]
    fn counts_the_changes_of_a_real_repository() {
        let dir = tempfile::tempdir().unwrap();
        let init = Command::new("git")
            .arg("-C")
            .arg(dir.path())
            .arg("init")
            .output();
        if init.is_err() {
            return; // git is not installed on this machine
        }
        std::fs::write(dir.path().join("a.txt"), "x").unwrap();
        let read = status(dir.path()).unwrap();
        assert_eq!(read.changed, 1);
        assert!(!read.branch.is_empty());
    }
}
