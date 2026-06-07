//! Wayland capture via `grim` and `slurp`.
//!
//! `slurp` is the standard Wayland region picker; it prints a
//! `WxH+X+Y` geometry string to stdout. `grim` reads that string
//! (or `-` for fullscreen) and writes PNG bytes to stdout.

use std::process::Stdio;

use better_shot_core::prelude::Rect;
use better_shot_core::{AppError, Result};
use tokio::io::AsyncReadExt;
use tokio::process::Command;

use super::super::decode::decode_png_to_capture;
use super::super::Capture;
use super::super::CaptureBackend;
use super::super::CaptureMode;
use super::super::CaptureRequest;

/// Wayland capture backend using `grim` + `slurp`.
pub struct GrimSlurpBackend;

#[async_trait::async_trait]
impl CaptureBackend for GrimSlurpBackend {
    fn name(&self) -> &'static str {
        "grim+slurp"
    }

    async fn capture(&self, req: &CaptureRequest) -> Result<Capture> {
        if req.delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(u64::from(req.delay_ms))).await;
        }

        match req.mode {
            CaptureMode::Fullscreen => grim_fullscreen().await,
            CaptureMode::Region => {
                let region = req.region.ok_or_else(|| {
                    AppError::Validation("region required for region capture".to_string())
                })?;
                grim_region(region).await
            }
            CaptureMode::Window => grim_window().await,
        }
    }
}

async fn grim_fullscreen() -> Result<Capture> {
    let bytes = run_grim(&["-"]).await?;
    decode_png_to_capture(bytes)
}

async fn grim_region(rect: Rect) -> Result<Capture> {
    let geom = format!("{}x{}+{}+{}", rect.width, rect.height, rect.x, rect.y);
    let bytes = run_grim(&["-g", &geom]).await?;
    decode_png_to_capture(bytes)
}

async fn grim_window() -> Result<Capture> {
    // `slurp` has no native window picker (it does regions), so for
    // window mode we ask the user to pick a region and treat it as
    // a window bbox. Window mode is M1.3 work; this is a placeholder
    // that still produces a valid image.
    let geom = run_slurp().await?;
    if geom.is_empty() {
        return Err(AppError::Cancelled);
    }
    let bytes = run_grim(&["-g", &geom]).await?;
    decode_png_to_capture(bytes)
}

async fn run_grim(args: &[&str]) -> Result<Vec<u8>> {
    let mut child = Command::new("grim")
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| AppError::MissingDependency(format!("grim: {e}")))?;

    let mut stdout = child
        .stdout
        .take()
        .ok_or_else(|| AppError::backend("grim: missing stdout"))?;
    let mut bytes = Vec::new();
    stdout
        .read_to_end(&mut bytes)
        .await
        .map_err(|e| AppError::backend(format!("grim: read stdout: {e}")))?;

    let status = child
        .wait()
        .await
        .map_err(|e| AppError::backend(format!("grim: wait: {e}")))?;
    if !status.success() {
        return Err(AppError::backend(format!("grim exited with {}", status)));
    }
    Ok(bytes)
}

async fn run_slurp() -> Result<String> {
    let output = Command::new("slurp")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| AppError::MissingDependency(format!("slurp: {e}")))?;

    // slurp returns exit code 1 when the user dismisses the picker.
    let code = output.status.code().unwrap_or(-1);
    if code == 1 {
        return Err(AppError::Cancelled);
    }
    if !output.status.success() {
        return Err(AppError::backend(format!("slurp exited with {code}")));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
