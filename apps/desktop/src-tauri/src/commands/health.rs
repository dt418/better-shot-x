//! Health check command — used by the UI to verify the Tauri bridge.

use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub fn ping(state: State<'_, AppState>) -> String {
    let _ = state;
    "pong".to_string()
}
