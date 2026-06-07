//! Capture engine: region, fullscreen, and window capture.
//!
//! Backend resolution: Wayland → `grim`/`slurp` → xdg-desktop-portal →
//! `screenshots-rs`; X11 → `screenshots-rs` → `maim` → `scrot`.
//!
//! All backends return [`Capture`] in RGBA8; saving / encoding is the
//! caller's responsibility (see [`Capture::save_to`]).

#![forbid(unsafe_code)]

mod backends;
mod decode;

use std::path::PathBuf;

use better_shot_core::prelude::{ImageFormat, Rect};
use better_shot_core::{AppError, Result};
use serde::{Deserialize, Serialize};

pub use backends::{GrimSlurpBackend, PortalBackend, ScreenshotsRsBackend};

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
            .ok_or_else(|| AppError::other("invalid image buffer"))?;
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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
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
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct CaptureRequest {
    /// What to capture.
    pub mode: CaptureMode,
    /// Optional region (required for [`CaptureMode::Region`]).
    pub region: Option<Rect>,
    /// Optional delay in milliseconds before capture.
    pub delay_ms: u32,
}

impl CaptureRequest {
    /// Convenience: fullscreen capture.
    pub fn fullscreen() -> Self {
        Self {
            mode: CaptureMode::Fullscreen,
            region: None,
            delay_ms: 0,
        }
    }

    /// Convenience: region capture.
    pub fn region(rect: Rect) -> Self {
        Self {
            mode: CaptureMode::Region,
            region: Some(rect),
            delay_ms: 0,
        }
    }
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
///
/// Priority (Wayland):
///   1. `grim` + `slurp` (CLI tools; fast, region picker built-in)
///   2. xdg-desktop-portal (interactive; works in sandboxed environments)
///   3. `screenshots-rs` (sync crate; fallback)
///
/// Priority (X11):
///   1. `screenshots-rs` (sync crate; fastest)
///   2. portal (X11 portals work too via xdg-desktop-portal-gtk)
///
/// The returned backend is the *first* one we can instantiate; the
/// caller may want to probe the next-best on failure for resilience.
pub fn select_backend() -> Box<dyn CaptureBackend> {
    use better_shot_platform::DisplayBackend;

    let display_backend = DisplayBackend::detect();
    tracing::info!(backend = ?display_backend, "selecting capture backend");

    match display_backend {
        DisplayBackend::Wayland => {
            if which_exists("grim") {
                Box::new(GrimSlurpBackend)
            } else {
                Box::new(PortalBackend)
            }
        }
        DisplayBackend::X11 => {
            if is_screenshots_rs_available() {
                Box::new(ScreenshotsRsBackend)
            } else {
                Box::new(PortalBackend)
            }
        }
        DisplayBackend::Unknown => {
            tracing::warn!("no display backend detected; falling back to XDG portal");
            Box::new(PortalBackend)
        }
    }
}

fn which_exists(tool: &str) -> bool {
    better_shot_platform::which(tool).is_ok()
}

#[cfg(target_os = "linux")]
fn is_screenshots_rs_available() -> bool {
    // The `screenshots` crate is Linux-only and works on both X11
    // and Wayland. We always have it compiled in on Linux; this
    // helper exists to keep the selection logic in one place.
    true
}

#[cfg(not(target_os = "linux"))]
fn is_screenshots_rs_available() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fullscreen_request_construction() {
        let req = CaptureRequest::fullscreen();
        assert_eq!(req.mode, CaptureMode::Fullscreen);
        assert!(req.region.is_none());
    }

    #[test]
    fn region_request_construction() {
        let rect = Rect {
            x: 10,
            y: 20,
            width: 300,
            height: 400,
        };
        let req = CaptureRequest::region(rect);
        assert_eq!(req.mode, CaptureMode::Region);
        assert_eq!(req.region, Some(rect));
    }

    #[test]
    fn select_backend_returns_known_name() {
        let backend = select_backend();
        let name = backend.name();
        assert!(
            matches!(name, "grim+slurp" | "xdg-desktop-portal" | "screenshots-rs"),
            "unexpected backend name: {name}"
        );
    }

    #[tokio::test]
    async fn portal_backend_smoke_test() {
        // On Linux this exercises the real portal path; on other
        // platforms it must return an explicit "not available"
        // error rather than panicking.
        let req = CaptureRequest::fullscreen();
        let result = PortalBackend.capture(&req).await;
        #[cfg(not(target_os = "linux"))]
        {
            assert!(result.is_err());
            let err = result.unwrap_err();
            assert!(
                err.to_string().contains("only available on Linux"),
                "unexpected error: {err}"
            );
        }
        // On Linux we don't assert success — it would require a
        // running compositor + portal. We just make sure the call
        // returns without panicking.
        #[cfg(target_os = "linux")]
        let _ = result;
    }
}
