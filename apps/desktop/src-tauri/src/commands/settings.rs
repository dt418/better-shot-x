//! Settings command handlers — read and update user configuration.

use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let snapshot = state.settings.lock().clone();
    serde_json::to_value(snapshot).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(state: State<'_, AppState>, patch: serde_json::Value) -> Result<(), String> {
    let mut guard = state.settings.lock();
    let mut current: better_shot_settings::Settings =
        serde_json::from_value(serde_json::to_value(&*guard).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    let patch_typed: better_shot_settings::Settings =
        serde_json::from_value(patch).map_err(|e| e.to_string())?;
    current.merge(patch_typed);
    current
        .save(&state.paths.config_file())
        .map_err(|e| e.to_string())?;
    *guard = current;
    Ok(())
}
