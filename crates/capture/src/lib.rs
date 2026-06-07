//! Capture engine: region, fullscreen, and window capture.
//!
//! Backend resolution: Wayland → `grim`/`slurp` → xdg-desktop-portal →
//! `screenshots-rs`; X11 → `screenshots-rs` → `maim` → `scrot`.

#![forbid(unsafe_code)]

use std::path::PathBuf;

use better_shot_core::prelude::{ImageFormat, Rect};
use better_shot_core::Result;
use serde::{Deserialize, Serialize};

/// A captured image in memory.
#[derive(Debug, Clone)]
pub struct Capture {
    /// Pixel data (RGBA8).
    pub pixels: Vec<u8>,
    /// Width in pixels.
    pub width: u32,
    /// Height in pixels.
    pub height: u32,
}

impl Capture {
    /// Encode to the requested format and write to `path`.
    pub fn save_to(&self, path: &PathBuf, format: ImageFormat) -> Result<()> {
        let img = image::RgbaImage::from_raw(self.width, self.height, self.pixels.clone())
            .ok_or_else(|| better_shot_core::AppError::other("invalid image buffer"))?;
        match format {
            ImageFormat::Png => img.save_with_format(path, image::ImageFormat::Png),
            ImageFormat::Jpeg => img.save_with_format(path, image::ImageFormat::Jpeg),
            ImageFormat::WebP => img.save_with_format(path, image::ImageFormat::WebP),
            ImageFormat::Bmp => img.save_with_format(path, image::ImageFormat::Bmp),
            ImageFormat::Gif => img.save_with_format(path, image::ImageFormat::Gif),
        }
        .map_err(Into::into)
    }
}

/// Capture mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CaptureMode {
    /// User-selected rectangular region.
    Region,
    /// Full virtual screen.
    Fullscreen,
    /// Specific window (provided by window picker).
    Window,
}

/// Request to perform a capture.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureRequest {
    /// What to capture.
    pub mode: CaptureMode,
    /// Optional region (required for [`CaptureMode::Region`]).
    pub region: Option<Rect>,
    /// Optional delay in milliseconds before capture.
    pub delay_ms: u32,
}

/// Trait implemented by every capture backend.
#[async_trait::async_trait]
pub trait CaptureBackend: Send + Sync {
    /// Human-readable backend name (e.g. `"grim+slurp"`).
    fn name(&self) -> &'static str;

    /// Perform the capture and return the result.
    async fn capture(&self, req: &CaptureRequest) -> Result<Capture>;
}

/// Probe available backends and pick the best one for the current session.
pub fn select_backend() -> Box<dyn CaptureBackend> {
    // TODO (Milestone 1): implement backend detection and selection.
    Box::new(StubBackend)
}

struct StubBackend;

#[async_trait::async_trait]
impl CaptureBackend for StubBackend {
    fn name(&self) -> &'static str {
        "stub"
    }
    async fn capture(&self, _req: &CaptureRequest) -> Result<Capture> {
        Err(better_shot_core::AppError::backend(
            "capture backend not yet implemented (Milestone 1)",
        ))
    }
}
