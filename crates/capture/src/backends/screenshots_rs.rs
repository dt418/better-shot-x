//! X11 (and Wayland fallback) capture via the `screenshots` crate.
//!
//! `screenshots` 0.8 is a sync Rust crate that wraps X11 / Wayland
//! calls. We push every call into `tokio::task::spawn_blocking` so
//! it doesn't stall the runtime.

use better_shot_core::prelude::Rect;
use better_shot_core::{AppError, Result};

use super::super::Capture;
use super::super::CaptureBackend;
use super::super::CaptureMode;
use super::super::CaptureRequest;

/// `screenshots`-crate based capture backend.
pub struct ScreenshotsRsBackend;

#[async_trait::async_trait]
impl CaptureBackend for ScreenshotsRsBackend {
    fn name(&self) -> &'static str {
        "screenshots-rs"
    }

    async fn capture(&self, req: &CaptureRequest) -> Result<Capture> {
        if req.delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(u64::from(req.delay_ms))).await;
        }

        match req.mode {
            CaptureMode::Fullscreen => capture_fullscreen().await,
            CaptureMode::Region => {
                let rect = req.region.ok_or_else(|| {
                    AppError::Validation("region required for region capture".to_string())
                })?;
                capture_region(rect).await
            }
            CaptureMode::Window => Err(AppError::backend(
                "window capture via screenshots-rs not yet implemented",
            )),
        }
    }
}

#[cfg(target_os = "linux")]
async fn capture_fullscreen() -> Result<Capture> {
    tokio::task::spawn_blocking(sync_capture_fullscreen)
        .await
        .map_err(|e| AppError::backend(format!("screenshots-rs: join: {e}")))?
}

#[cfg(target_os = "linux")]
async fn capture_region(rect: Rect) -> Result<Capture> {
    tokio::task::spawn_blocking(move || sync_capture_region(rect))
        .await
        .map_err(|e| AppError::backend(format!("screenshots-rs: join: {e}")))?
}

#[cfg(target_os = "linux")]
fn sync_capture_fullscreen() -> Result<Capture> {
    use screenshots::Screen;

    let screen = Screen::all()
        .map_err(|e| AppError::backend(format!("screenshots-rs: enumerate screens: {e}")))?
        .into_iter()
        .next()
        .ok_or_else(|| AppError::backend("no screens available"))?;

    let img = screen
        .capture()
        .map_err(|e| AppError::backend(format!("screenshots-rs: capture: {e}")))?;
    Ok(image_to_capture(img))
}

#[cfg(target_os = "linux")]
fn sync_capture_region(rect: Rect) -> Result<Capture> {
    use screenshots::Screen;

    let screen = Screen::from_point(rect.x, rect.y).map_err(|e| {
        AppError::backend(format!(
            "screenshots-rs: no screen at ({}, {}): {e}",
            rect.x, rect.y
        ))
    })?;

    let img = screen
        .capture_area(rect.x, rect.y, rect.width, rect.height)
        .map_err(|e| AppError::backend(format!("screenshots-rs: capture_area: {e}")))?;
    Ok(image_to_capture(img))
}

#[cfg(target_os = "linux")]
fn image_to_capture(img: screenshots::image::RgbaImage) -> Capture {
    let (width, height) = img.dimensions();
    Capture {
        pixels: img.into_raw(),
        width,
        height,
    }
}

#[cfg(not(target_os = "linux"))]
async fn capture_fullscreen() -> Result<Capture> {
    Err(AppError::backend("screenshots-rs is Linux-only"))
}

#[cfg(not(target_os = "linux"))]
async fn capture_region(_rect: Rect) -> Result<Capture> {
    Err(AppError::backend("screenshots-rs is Linux-only"))
}
