//! Common geometric and format types.

use serde::{Deserialize, Serialize};

/// 2D axis-aligned rectangle in physical pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub struct Rect {
    /// X coordinate of the top-left corner.
    pub x: i32,
    /// Y coordinate of the top-left corner.
    pub y: i32,
    /// Width in pixels.
    pub width: u32,
    /// Height in pixels.
    pub height: u32,
}

impl Rect {
    /// Construct a new rectangle.
    pub const fn new(x: i32, y: i32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    /// Returns true if this rectangle has zero area.
    pub const fn is_empty(&self) -> bool {
        self.width == 0 || self.height == 0
    }

    /// Returns the area in pixels².
    pub const fn area(&self) -> u64 {
        self.width as u64 * self.height as u64
    }
}

/// 2D size in pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub struct Size {
    /// Width in pixels.
    pub width: u32,
    /// Height in pixels.
    pub height: u32,
}

impl Size {
    /// Construct a new size.
    pub const fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }
}

/// Supported image output formats.
#[derive(
    Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type,
)]
#[serde(rename_all = "lowercase")]
pub enum ImageFormat {
    /// PNG (lossless, default).
    #[default]
    Png,
    /// JPEG (lossy, smaller files).
    Jpeg,
    /// WebP (modern, balanced).
    WebP,
    /// BMP (uncompressed, large).
    Bmp,
    /// GIF (animations).
    Gif,
}

impl ImageFormat {
    /// File extension without the leading dot.
    pub const fn extension(&self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::WebP => "webp",
            Self::Bmp => "bmp",
            Self::Gif => "gif",
        }
    }

    /// MIME type for HTTP responses / clipboard targets.
    pub const fn mime_type(&self) -> &'static str {
        match self {
            Self::Png => "image/png",
            Self::Jpeg => "image/jpeg",
            Self::WebP => "image/webp",
            Self::Bmp => "image/bmp",
            Self::Gif => "image/gif",
        }
    }
}

/// Generic identifier type — wraps a UUID string.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(transparent)]
pub struct Id(pub String);

impl Id {
    /// Generate a new v4 UUID.
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4().to_string())
    }
}

impl std::fmt::Display for Id {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

impl Default for Id {
    fn default() -> Self {
        Self::new()
    }
}

/// A saved screenshot entry.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct Screenshot {
    pub id: Id,
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub byte_size: u32,
    pub created_at: String,
    pub favorited: bool,
    pub tags: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rect_area() {
        let r = Rect::new(0, 0, 10, 20);
        assert_eq!(r.area(), 200);
        assert!(!r.is_empty());
        let empty = Rect::new(0, 0, 0, 5);
        assert!(empty.is_empty());
    }

    #[test]
    fn image_format_extensions() {
        assert_eq!(ImageFormat::Png.extension(), "png");
        assert_eq!(ImageFormat::Jpeg.extension(), "jpg");
        assert_eq!(ImageFormat::Png.mime_type(), "image/png");
    }
}
