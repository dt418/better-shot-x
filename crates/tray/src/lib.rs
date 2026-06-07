//! System tray integration.

#![forbid(unsafe_code)]

use better_shot_core::Result;
use tauri::AppHandle;

/// Initialize the system tray on the given app handle.
pub fn init(_app: &AppHandle) -> Result<()> {
    // TODO (Milestone 1): build tray menu and icon.
    Ok(())
}
