//! Global shortcut registration and conflict detection.

use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tracing::info;

use crate::error::CmdResult;
use crate::state::AppState;

pub fn register(app: &AppHandle, _state: &AppState) -> CmdResult<()> {
    let shortcut: Shortcut =
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Digit1);
    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                info!("region-capture shortcut pressed");
                let _ = app_handle.emit("shortcut://region-capture", ());
            }
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}
