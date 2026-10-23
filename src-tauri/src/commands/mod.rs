pub mod pty;
pub mod workspace;

#[tauri::command]
pub fn ping() -> String {
    "pong".into()
}
