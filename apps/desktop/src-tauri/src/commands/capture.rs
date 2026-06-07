//! Capture command handlers — invoke the engine to grab pixels and
//! persist them to disk.

use std::path::PathBuf;

use better_shot_capture::window::WindowInfo;
use better_shot_capture::{select_backend, window as window_engine, CaptureRequest};
use better_shot_core::prelude::{AppPaths, ImageFormat};
use tauri::State;

use crate::error::CmdResult;
use crate::state::AppState;

/// Take a screenshot and save it to the configured screenshots
/// directory. Returns the absolute path of the saved file.
#[tauri::command]
#[specta::specta]
pub async fn capture_save(
    state: State<'_, AppState>,
    req: CaptureRequest,
    format: ImageFormat,
) -> CmdResult<String> {
    let backend = select_backend();
    tracing::info!(backend = backend.name(), ?req, "capture_save invoked");

    let capture = backend.capture(&req).await.map_err(|e| e.to_string())?;
    let path = build_output_path(&state.paths, &format);

    capture.save_to(&path, format).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

/// List the visible windows the user can pick from.
///
/// Returns a flat array of [`WindowInfo`] (id, title, app name, geometry)
/// ordered by title. Used to drive the window picker overlay.
#[tauri::command]
#[specta::specta]
pub async fn list_windows() -> CmdResult<Vec<WindowInfo>> {
    window_engine::list_windows().map_err(|e| e.to_string())
}

fn build_output_path(paths: &AppPaths, format: &ImageFormat) -> PathBuf {
    let ext = match format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::WebP => "webp",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Gif => "gif",
    };
    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    paths.screenshots_dir().join(format!("shot-{stamp}.{ext}"))
}
