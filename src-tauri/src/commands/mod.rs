pub mod agents;
pub mod git;
pub mod project;
pub mod pty;
#[cfg(all(test, windows))]
mod test_support;
pub mod workspace;

#[tauri::command]
pub fn ping() -> String {
    "pong".into()
}
