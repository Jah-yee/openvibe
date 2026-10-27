//! Windows' PATH, re-read from the registry: an agent installed while OpenVibe
//! runs is on the PATH of new terminals, not of this process.

use std::ffi::OsString;
use std::sync::RwLock;

static REFRESHED: RwLock<Option<OsString>> = RwLock::new(None);

/// Expands `%NAME%` references like a `REG_EXPAND_SZ` value; an unknown
/// variable, or a lone `%`, stays as written.
pub fn expand(raw: &str, var: impl Fn(&str) -> Option<String>) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut rest = raw;
    while let Some(start) = rest.find('%') {
        out.push_str(&rest[..start]);
        let after = &rest[start + 1..];
        match after.find('%') {
            Some(end) if end > 0 => match var(&after[..end]) {
                Some(value) => {
                    out.push_str(&value);
                    rest = &after[end + 1..];
                }
                None => {
                    out.push('%');
                    rest = after;
                }
            },
            _ => {
                out.push('%');
                rest = after;
            }
        }
    }
    out.push_str(rest);
    out
}

fn same_folder(entry: &str) -> String {
    entry.trim_end_matches(['\\', '/']).to_lowercase()
}

/// Machine PATH, then user PATH (as Windows builds a new process's PATH),
/// then what only this process has, so what OpenVibe started with is kept.
pub fn merge(machine: &str, user: &str, process: &str) -> String {
    let mut seen = std::collections::HashSet::new();
    let mut entries: Vec<&str> = Vec::new();
    for entry in [machine, user, process]
        .into_iter()
        .flat_map(|list| list.split(';'))
    {
        let entry = entry.trim();
        if !entry.is_empty() && seen.insert(same_folder(entry)) {
            entries.push(entry);
        }
    }
    entries.join(";")
}

#[cfg(windows)]
fn registry_path(root: winreg::HKEY, key: &str) -> String {
    winreg::RegKey::predef(root)
        .open_subkey(key)
        .and_then(|key| key.get_value::<String, _>("Path"))
        .unwrap_or_default()
}

/// Re-reads the PATH from the registry (no-op off Windows).
pub fn refresh() {
    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
        let env = |name: &str| std::env::var(name).ok();
        let user = expand(&registry_path(HKEY_CURRENT_USER, "Environment"), env);
        let machine = expand(
            &registry_path(
                HKEY_LOCAL_MACHINE,
                r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
            ),
            env,
        );
        let process = std::env::var("PATH").unwrap_or_default();
        let merged = merge(&machine, &user, &process);
        *REFRESHED.write().unwrap_or_else(|e| e.into_inner()) = Some(merged.into());
    }
}

/// The refreshed PATH; `None` until the first refresh.
pub fn current() -> Option<OsString> {
    REFRESHED.read().unwrap_or_else(|e| e.into_inner()).clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vars(name: &str) -> Option<String> {
        match name {
            "USERPROFILE" => Some(r"C:\Users\Me".into()),
            "LOCALAPPDATA" => Some(r"C:\Users\Me\AppData\Local".into()),
            _ => None,
        }
    }

    #[test]
    fn expands_known_variables() {
        assert_eq!(
            expand(r"%USERPROFILE%\bin;;C:\x", vars),
            r"C:\Users\Me\bin;;C:\x"
        );
        assert_eq!(
            expand(r"%LOCALAPPDATA%\Programs\a", vars),
            r"C:\Users\Me\AppData\Local\Programs\a"
        );
    }

    #[test]
    fn keeps_unknown_variables_and_lone_percents() {
        assert_eq!(expand(r"%NOPE%\bin", vars), r"%NOPE%\bin");
        assert_eq!(expand(r"C:\100%\x", vars), r"C:\100%\x");
        assert_eq!(expand("%%", vars), "%%");
    }

    #[test]
    fn merges_machine_then_user_then_process_only() {
        assert_eq!(
            merge(r"C:\m1;C:\m2", r"C:\u1", r"C:\m2;C:\p1;C:\u1"),
            r"C:\m1;C:\m2;C:\u1;C:\p1"
        );
    }

    #[test]
    fn merge_drops_empty_entries_and_duplicates() {
        assert_eq!(
            merge(r"C:\Bin;;C:\bin\;c:\BIN/", "", r"C:\other\"),
            r"C:\Bin;C:\other\"
        );
        assert_eq!(merge("", "", ""), "");
    }
}
