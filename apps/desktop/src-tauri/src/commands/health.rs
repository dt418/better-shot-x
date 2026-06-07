//! Health check command — used by the UI to verify the Tauri bridge.

use tauri::State;

use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub fn ping(_state: State<'_, AppState>) -> String {
    "pong".to_string()
}
