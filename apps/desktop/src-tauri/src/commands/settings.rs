//! Settings command handlers — read and update user configuration.

use better_shot_core::AppConfig;
use tauri::State;

use crate::state::AppState;

/// Return the current [`AppConfig`] snapshot.
#[tauri::command]
#[specta::specta]
pub fn get_settings(state: State<'_, AppState>) -> AppConfig {
    state.settings.lock().clone()
}

/// Replace the current [`AppConfig`] with `patch` and persist it.
///
/// The frontend is expected to read the current config via
/// [`get_settings`], mutate the fields it cares about, and send the
/// whole struct back. Field-level diffs land in M1.4 when the
/// Settings UI is built.
#[tauri::command]
#[specta::specta]
pub fn update_settings(state: State<'_, AppState>, patch: AppConfig) -> Result<(), String> {
    let mut guard = state.settings.lock();
    let merged = better_shot_settings::merge(&guard, patch);
    better_shot_settings::save(&state.paths.config_file(), &merged).map_err(|e| e.to_string())?;
    *guard = merged;
    Ok(())
}
