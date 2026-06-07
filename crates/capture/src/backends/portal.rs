//! XDG Desktop Portal capture backend.
//!
//! Uses `xdg-desktop-portal` via the `ashpd` crate. This is the
//! most portable option: it works on every modern Linux desktop,
//! including sandboxed environments (Flatpak, Snap, immutable
//! distros), and gives the user full control over what gets
//! captured (region, window, full screen).

use better_shot_core::Result;

use super::super::decode::decode_png_to_capture;
use super::super::Capture;
use super::super::CaptureBackend;
use super::super::CaptureRequest;

/// XDG Desktop Portal capture backend.
pub struct PortalBackend;

#[async_trait::async_trait]
impl CaptureBackend for PortalBackend {
    fn name(&self) -> &'static str {
        "xdg-desktop-portal"
    }

    async fn capture(&self, req: &CaptureRequest) -> Result<Capture> {
        if req.delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(u64::from(req.delay_ms))).await;
        }

        if let Some(rect) = req.region {
            tracing::debug!(
                ?rect,
                "portal: requested region ignored (user picks interactively)"
            );
        }

        // The portal helper is only available on Linux; on other
        // platforms we fail with a clear error so callers can pick
        // a different backend.
        #[cfg(target_os = "linux")]
        {
            let shot = better_shot_platform::portal_take_screenshot().await?;
            return decode_png_to_capture(shot.bytes);
        }

        #[cfg(not(target_os = "linux"))]
        {
            let _ = req;
            Err(better_shot_core::AppError::backend(
                "xdg-desktop-portal is only available on Linux",
            ))
        }
    }
}
