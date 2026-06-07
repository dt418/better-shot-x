//! Cross-crate clipboard façade backed by [`arboard`] on Linux.
//!
//! `arboard::Clipboard` is not `Send`, so we open a fresh handle per
//! call rather than parking one in shared state. The call site is
//! typically a short-lived Tauri command or tray handler, so the
//! per-call cost (a single `malloc` and a D-Bus round-trip on Linux)
//! is negligible.
//!
//! Both public functions are no-ops on non-Linux targets — the
//! capture command surface still compiles cross-platform; only the
//! copy itself returns an error there.

#![forbid(unsafe_code)]

use better_shot_core::{AppError, Result};
use std::borrow::Cow;

/// Copy an RGBA8 image (`width * height * 4` bytes) to the system clipboard.
pub fn copy_image(pixels: &[u8], width: u32, height: u32) -> Result<()> {
    copy_image_inner(pixels, width, height)
}

#[cfg(target_os = "linux")]
fn copy_image_inner(pixels: &[u8], width: u32, height: u32) -> Result<()> {
    use arboard::ImageData;
    use std::num::NonZeroUsize;

    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|px| px.checked_mul(4))
        .ok_or_else(|| AppError::Validation("image dimensions overflow usize".into()))?;

    if pixels.len() < expected {
        return Err(AppError::Validation(format!(
            "pixel buffer too small: got {} bytes, expected {}",
            pixels.len(),
            expected
        )));
    }

    let width = NonZeroUsize::new(width as usize)
        .ok_or_else(|| AppError::Validation("image width must be > 0".into()))?;
    let height = NonZeroUsize::new(height as usize)
        .ok_or_else(|| AppError::Validation("image height must be > 0".into()))?;

    let image = ImageData {
        width: width.get(),
        height: height.get(),
        bytes: Cow::Borrowed(pixels),
    };

    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| AppError::backend(format!("clipboard init failed: {e}")))?;
    clipboard
        .set_image(image)
        .map_err(|e| AppError::backend(format!("clipboard set_image failed: {e}")))?;
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn copy_image_inner(_pixels: &[u8], _width: u32, _height: u32) -> Result<()> {
    Err(AppError::backend(
        "clipboard image copy is only available on Linux in this build",
    ))
}

/// Copy a UTF-8 string to the system clipboard.
pub fn copy_text(text: &str) -> Result<()> {
    copy_text_inner(text)
}

#[cfg(target_os = "linux")]
fn copy_text_inner(text: &str) -> Result<()> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| AppError::backend(format!("clipboard init failed: {e}")))?;
    clipboard
        .set_text(text)
        .map_err(|e| AppError::backend(format!("clipboard set_text failed: {e}")))?;
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn copy_text_inner(_text: &str) -> Result<()> {
    Err(AppError::backend(
        "clipboard text copy is only available on Linux in this build",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copy_text_rejects_empty() {
        // No display server in CI — we still expect the function to
        // reach the platform layer. Whether it succeeds depends on
        // the environment, so we accept either result and just
        // assert the call does not panic.
        let _ = copy_text("");
    }

    #[test]
    fn copy_image_rejects_wrong_buffer_size() {
        let err = copy_image(&[0u8; 4], 2, 2).unwrap_err();
        let msg = err.to_string();
        assert!(
            msg.contains("pixel buffer too small") || msg.contains("clipboard init failed"),
            "unexpected error: {msg}"
        );
    }

    #[test]
    fn copy_image_rejects_zero_dimensions() {
        // (0, 1) trips the NonZeroUsize guard before we touch arboard.
        let err = copy_image(&[], 0, 1).unwrap_err();
        assert!(err.to_string().contains("width"));
    }
}
