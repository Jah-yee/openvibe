use tauri::State;

use crate::db::nodes::{self, NodeKind};
use crate::db::scenes::{self, SceneFile, WorkspaceData};
use crate::db::workspaces::{self, Workspace};
use crate::db::{Db, settings};
use crate::error::AppResult;

#[tauri::command]
pub async fn list_workspaces(db: State<'_, Db>) -> AppResult<Vec<Workspace>> {
    db.with(|conn| workspaces::list(conn))
}

#[tauri::command]
pub async fn create_workspace(db: State<'_, Db>, name: String) -> AppResult<Workspace> {
    db.with(|conn| workspaces::create(conn, &name))
}

#[tauri::command]
pub async fn rename_workspace(db: State<'_, Db>, id: String, name: String) -> AppResult<()> {
    db.with(|conn| workspaces::rename(conn, &id, &name))
}

#[tauri::command]
pub async fn delete_workspace(db: State<'_, Db>, id: String) -> AppResult<()> {
    db.with(|conn| workspaces::delete(conn, &id))
}

#[tauri::command]
pub async fn load_workspace(db: State<'_, Db>, id: String) -> AppResult<WorkspaceData> {
    db.with(|conn| scenes::load(conn, &id))
}

#[tauri::command]
pub async fn save_scene(
    db: State<'_, Db>,
    workspace_id: String,
    elements_json: String,
    app_state_json: String,
    node_ids: Vec<String>,
) -> AppResult<()> {
    db.with(|conn| {
        scenes::save(
            conn,
            &workspace_id,
            &elements_json,
            &app_state_json,
            &node_ids,
        )
    })
}

#[tauri::command]
pub async fn save_files(
    db: State<'_, Db>,
    workspace_id: String,
    files: Vec<SceneFile>,
) -> AppResult<()> {
    db.with(|conn| scenes::save_files(conn, &workspace_id, &files))
}

#[tauri::command]
pub async fn save_node(
    db: State<'_, Db>,
    id: String,
    workspace_id: String,
    kind: NodeKind,
    payload_json: String,
) -> AppResult<()> {
    db.with(|conn| nodes::save(conn, &id, &workspace_id, kind, &payload_json))
}

#[tauri::command]
pub async fn get_setting(db: State<'_, Db>, key: String) -> AppResult<Option<serde_json::Value>> {
    db.with(|conn| settings::get(conn, &key))
}

#[tauri::command]
pub async fn set_setting(
    db: State<'_, Db>,
    key: String,
    value: serde_json::Value,
) -> AppResult<()> {
    db.with(|conn| settings::set(conn, &key, &value))
}
