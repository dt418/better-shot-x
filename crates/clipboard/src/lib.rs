//! Clipboard engine — image, text, and file-path operations.

#![forbid(unsafe_code)]

use better_shot_core::Result;

/// Copy an RGBA8 image to the system clipboard.
pub fn copy_image(_pixels: &[u8], _width: u32, _height: u32) -> Result<()> {
    // TODO (Milestone 1): use arboard.
    Ok(())
}

/// Copy plain text to the system clipboard.
pub fn copy_text(_text: &str) -> Result<()> {
    // TODO (Milestone 1): use arboard.
    Ok(())
}
