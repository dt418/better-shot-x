//! Window enumeration and capture.
//!
//! Lists visible windows, then captures a specific one.

mod backends;

use better_shot_core::prelude::Rect;
use better_shot_core::Result;
use serde::{Deserialize, Serialize};
use specta::Type;

pub use backends::window_backend;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WindowInfo {
    pub id: WindowId,
    pub title: String,
    pub app_name: String,
    pub geometry: Rect,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
pub struct WindowId(pub String);

impl WindowId {
    /// Wrap a raw backend window id (e.g. `"0x12345"` for X11, `"42"` for Wayland).
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub fn list_windows() -> Result<Vec<WindowInfo>> {
    window_backend().list_windows()
}

pub async fn capture_window(id: &WindowId) -> Result<super::Capture> {
    window_backend().capture(id).await
}
