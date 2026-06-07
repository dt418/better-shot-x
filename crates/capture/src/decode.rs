//! Shared helpers for backends that receive a PNG byte stream.

use better_shot_core::AppError;
use better_shot_core::Result;

use crate::Capture;

/// Decode a PNG byte stream into a [`Capture`] in RGBA8.
pub(crate) fn decode_png_to_capture(bytes: Vec<u8>) -> Result<Capture> {
    let img = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
        .map_err(|e| AppError::backend(format!("png decode: {e}")))?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    Ok(Capture {
        pixels: rgba.into_raw(),
        width: w,
        height: h,
    })
}
