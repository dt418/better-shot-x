use better_shot_core::prelude::Screenshot;
use tauri::State;

use crate::error::CmdResult;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn list_history(
    state: State<'_, AppState>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> CmdResult<Vec<Screenshot>> {
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    better_shot_storage::list_screenshots(&state.storage, limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn search_history(
    state: State<'_, AppState>,
    query: String,
) -> CmdResult<Vec<Screenshot>> {
    better_shot_storage::search_screenshots(&state.storage, &query).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_history(state: State<'_, AppState>, id: String) -> CmdResult<()> {
    better_shot_storage::delete_screenshot(&state.storage, &id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn favorite_history(
    state: State<'_, AppState>,
    id: String,
    favorited: bool,
) -> CmdResult<()> {
    better_shot_storage::favorite_screenshot(&state.storage, &id, favorited)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn tag_history(
    state: State<'_, AppState>,
    id: String,
    tags: Vec<String>,
) -> CmdResult<()> {
    better_shot_storage::tag_screenshot(&state.storage, &id, &tags).map_err(|e| e.to_string())
}
