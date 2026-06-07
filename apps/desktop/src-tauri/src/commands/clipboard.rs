//! Tauri commands exposing the `clipboard` crate to the frontend.

use better_shot_core::Result;
use tauri::State;

use crate::error::CmdResult;
use crate::state::AppState;

#[derive(serde::Deserialize, specta::Type, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RgbaImage {
    pub width: u32,
    pub height: u32,
    /// RGBA8 pixel buffer, length must equal `width * height * 4`.
    pub pixels: Vec<u8>,
}

/// Copy an RGBA8 image to the system clipboard.
#[tauri::command]
#[specta::specta]
pub fn clipboard_copy_image(_state: State<'_, AppState>, image: RgbaImage) -> CmdResult<()> {
    clipboard_copy_image_impl(&image).map_err(cmd_err)
}

fn clipboard_copy_image_impl(image: &RgbaImage) -> Result<()> {
    better_shot_clipboard::copy_image(&image.pixels, image.width, image.height)
}

/// Copy a UTF-8 string to the system clipboard.
#[tauri::command]
#[specta::specta]
pub fn clipboard_copy_text(_state: State<'_, AppState>, text: String) -> CmdResult<()> {
    better_shot_clipboard::copy_text(&text).map_err(cmd_err)
}

fn cmd_err(e: better_shot_core::AppError) -> String {
    e.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rgba_image_deserializes_camel_case() {
        let json = r#"{"width":2,"height":2,"pixels":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}"#;
        let img: RgbaImage = serde_json::from_str(json).unwrap();
        assert_eq!(img.width, 2);
        assert_eq!(img.height, 2);
        assert_eq!(img.pixels.len(), 16);
    }

    #[test]
    fn rgba_image_deserializes_snake_case() {
        let json = r#"{"width":1,"height":1,"pixels":[0,0,0,0]}"#;
        let img: RgbaImage = serde_json::from_str(json).unwrap();
        assert_eq!(img.width, 1);
    }
}
