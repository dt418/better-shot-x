//! System tray icon with a context menu that emits Tauri events
//! the frontend listens for.
//!
//! The menu items map 1:1 to user-facing actions:
//!
//! | Menu id           | Event emitted   | Frontend action            |
//! |-------------------|-----------------|----------------------------|
//! | `tray_region`     | `tray-region`   | Open region picker         |
//! | `tray_fullscreen` | `tray-fullscreen` | Capture whole screen     |
//! | `tray_settings`   | `tray-settings` | Open settings panel        |
//! | `tray_quit`       | *(no event)*    | Exit the application       |
//!
//! The icon is a procedurally generated 32×32 solid teal square —
//! a real branded icon lands in a later milestone (the asset
//! pipeline is not yet scaffolded).
//!
//! Clipboard, history, and recording entries listed in the
//! architecture are deferred to M1.3 to keep the M1.2 tray surface
//! minimal and reviewable.

#![forbid(unsafe_code)]

use better_shot_core::Result;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Runtime};

const MENU_REGION: &str = "tray_region";
const MENU_FULLSCREEN: &str = "tray_fullscreen";
const MENU_SETTINGS: &str = "tray_settings";
const MENU_QUIT: &str = "tray_quit";

const EVENT_REGION: &str = "tray-region";
const EVENT_FULLSCREEN: &str = "tray-fullscreen";
const EVENT_SETTINGS: &str = "tray-settings";

/// Build the tray icon and attach it to the running app.
///
/// Safe to call once during the Tauri `setup` phase. Calling it
/// again on the same `AppHandle` will replace the previous tray.
pub fn init<R: Runtime>(app: &AppHandle<R>) -> Result<()> {
    let region = MenuItemBuilder::new("Region capture")
        .id(MENU_REGION)
        .accelerator("CmdOrCtrl+Shift+1")
        .build(app)
        .map_err(tray_err)?;
    let fullscreen = MenuItemBuilder::new("Fullscreen capture")
        .id(MENU_FULLSCREEN)
        .accelerator("CmdOrCtrl+Shift+2")
        .build(app)
        .map_err(tray_err)?;
    let settings = MenuItemBuilder::new("Settings")
        .id(MENU_SETTINGS)
        .build(app)
        .map_err(tray_err)?;
    let quit = MenuItemBuilder::new("Quit")
        .id(MENU_QUIT)
        .accelerator("CmdOrCtrl+Q")
        .build(app)
        .map_err(tray_err)?;

    let menu = MenuBuilder::new(app)
        .item(&region)
        .item(&fullscreen)
        .separator()
        .item(&settings)
        .separator()
        .item(&quit)
        .build()
        .map_err(tray_err)?;

    let icon = tauri::image::Image::new_owned(icon_rgba_32(), 32, 32);

    let app_handle = app.clone();
    TrayIconBuilder::with_id("better-shot-tray")
        .tooltip("Better Shot")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |_tray, event| {
            handle_menu_event(&app_handle, event.id().as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Left-click toggles window visibility — the menu
                // also opens on left click via `menu_on_left_click`,
                // so this is a no-op for now. Kept for future
                // single-click capture workflows.
                let _ = tray;
            }
        })
        .build(app)
        .map_err(tray_err)?;

    Ok(())
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        MENU_REGION => emit(app, EVENT_REGION),
        MENU_FULLSCREEN => emit(app, EVENT_FULLSCREEN),
        MENU_SETTINGS => emit(app, EVENT_SETTINGS),
        MENU_QUIT => app.exit(0),
        _ => tracing::warn!(menu_id = %id, "unhandled tray menu event"),
    }
}

fn emit<R: Runtime>(app: &AppHandle<R>, event: &str) {
    if let Err(e) = app.emit(event, ()) {
        tracing::warn!(event, error = %e, "failed to emit tray event");
    }
}

fn tray_err<E: std::fmt::Display>(e: E) -> better_shot_core::AppError {
    better_shot_core::AppError::backend(format!("tray: {e}"))
}

/// 32×32 RGBA8 solid teal square (placeholder icon).
fn icon_rgba_32() -> Vec<u8> {
    // RGBA: teal #1F8A8A with full alpha.
    const RGBA: [u8; 4] = [0x1F, 0x8A, 0x8A, 0xFF];
    let pixel: &[u8] = &RGBA;
    let mut buf = Vec::with_capacity(32 * 32 * 4);
    for _ in 0..(32 * 32) {
        buf.extend_from_slice(pixel);
    }
    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn icon_rgba_32_has_expected_length() {
        assert_eq!(icon_rgba_32().len(), 32 * 32 * 4);
    }

    #[test]
    fn icon_rgba_32_first_pixel_is_teal() {
        let buf = icon_rgba_32();
        assert_eq!(&buf[0..4], &[0x1F, 0x8A, 0x8A, 0xFF]);
    }
}
