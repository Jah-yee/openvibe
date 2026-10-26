use std::path::Path;

use crate::error::{AppError, AppResult};
use crate::mission::{self, Cleanup, MergeReport, Worktree};

/// Git can take seconds on a large repository: off the async runtime.
async fn blocking<T: Send + 'static>(
    job: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> AppResult<T> {
    tauri::async_runtime::spawn_blocking(job)
        .await
        .map_err(|err| AppError::Io(std::io::Error::other(err.to_string())))?
        .map_err(AppError::InvalidInput)
}

/// The mission's branch and worktree (spec orchestrateur §7.4).
#[tauri::command]
pub async fn mission_prepare(project: String, name: String) -> AppResult<Worktree> {
    blocking(move || mission::prepare(Path::new(&project), &name)).await
}

#[tauri::command]
pub async fn mission_add_agent(
    project: String,
    mission: String,
    agent: String,
) -> AppResult<Worktree> {
    blocking(move || mission::add_agent(Path::new(&project), &mission, &agent)).await
}

/// `mission` and `agent` are the worktrees' paths (spec orchestrateur §7.6).
#[tauri::command]
pub async fn mission_merge(
    mission: String,
    agent: String,
    branch: String,
) -> AppResult<MergeReport> {
    blocking(move || mission::merge_agent(Path::new(&mission), Path::new(&agent), &branch)).await
}

/// « Nettoyer la mission » (spec orchestrateur §7.7).
#[tauri::command]
pub async fn mission_cleanup(
    project: String,
    mission: String,
    agents: Vec<String>,
) -> AppResult<Cleanup> {
    blocking(move || mission::cleanup(Path::new(&project), &mission, &agents)).await
}
