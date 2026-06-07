//! OCR engine — text extraction from images.
//!
//! Phase 1: Tesseract 5 via `leptess`.
//! Phase 2: local AI models (TBD).

#![forbid(unsafe_code)]

use better_shot_core::Result;
use serde::{Deserialize, Serialize};

/// Supported OCR languages at launch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    /// English.
    En,
    /// Vietnamese.
    Vi,
    /// Chinese (Simplified).
    ZhCn,
    /// Japanese.
    Ja,
    /// Korean.
    Ko,
}

impl Language {
    /// Tesseract language code (e.g. `"eng"`, `"vie"`, `"chi_sim"`).
    pub const fn tess_code(&self) -> &'static str {
        match self {
            Self::En => "eng",
            Self::Vi => "vie",
            Self::ZhCn => "chi_sim",
            Self::Ja => "jpn",
            Self::Ko => "kor",
        }
    }
}

/// Result of an OCR run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    /// Extracted text.
    pub text: String,
    /// Average confidence (0..100).
    pub confidence: f32,
    /// Language used.
    pub language: Language,
    /// Per-word bounding boxes (optional).
    pub words: Vec<OcrWord>,
}

/// A single recognized word with its bounding box.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrWord {
    /// The recognized text.
    pub text: String,
    /// Confidence (0..100).
    pub confidence: f32,
    /// Bounding box.
    pub bbox: BBox,
}

/// Axis-aligned bounding box in pixel coordinates.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BBox {
    /// Left edge.
    pub x: i32,
    /// Top edge.
    pub y: i32,
    /// Width.
    pub w: u32,
    /// Height.
    pub h: u32,
}

/// Run OCR on a decoded RGBA8 image.
pub fn recognize(_pixels: &[u8], _width: u32, _height: u32, _lang: Language) -> Result<OcrResult> {
    // TODO (Milestone 5): implement via leptess.
    Err(better_shot_core::AppError::Ocr(
        "OCR not yet implemented (Milestone 5)".to_string(),
    ))
}
