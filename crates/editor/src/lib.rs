//! Editor engine — full Snagit-tier image editor.
//!
//! Provides document model, command system (undo/redo), render pipeline,
//! and filter system. Heavy work happens in WebGL / WASM at the UI layer;
//! this crate owns the *model* and *commands*.

#![forbid(unsafe_code)]

use better_shot_core::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Editor document — the in-memory model being edited.
#[derive(Debug, Clone)]
pub struct Document {
    id: Uuid,
    width: u32,
    height: u32,
    layers: Vec<Layer>,
}

impl Document {
    /// Create a new empty document of the given size.
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            id: Uuid::new_v4(),
            width,
            height,
            layers: vec![Layer::new_background(width, height)],
        }
    }

    /// Document unique identifier.
    pub fn id(&self) -> Uuid {
        self.id
    }

    /// Number of layers.
    pub fn layer_count(&self) -> usize {
        self.layers.len()
    }

    /// Document width in pixels.
    pub fn width(&self) -> u32 {
        self.width
    }

    /// Document height in pixels.
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Read-only view of the document's layers.
    pub fn layers(&self) -> &[Layer] {
        &self.layers
    }
}

/// A single layer in the document.
#[derive(Debug, Clone)]
pub struct Layer {
    id: Uuid,
    name: String,
    visible: bool,
    opacity: f32,
    blend: BlendMode,
}

impl Layer {
    fn new_background(width: u32, height: u32) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: format!("Background {width}x{height}"),
            visible: true,
            opacity: 1.0,
            blend: BlendMode::Normal,
        }
    }

    /// Layer unique identifier.
    pub fn id(&self) -> Uuid {
        self.id
    }

    /// Layer display name.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Whether the layer is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Layer opacity in `[0.0, 1.0]`.
    pub fn opacity(&self) -> f32 {
        self.opacity
    }

    /// Layer blend mode.
    pub fn blend_mode(&self) -> BlendMode {
        self.blend
    }
}

/// Blend mode for layer compositing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BlendMode {
    /// Standard alpha blending.
    Normal,
    /// Multiply.
    Multiply,
    /// Screen.
    Screen,
    /// Overlay.
    Overlay,
}

/// Reversible editor command (undo/redo support).
pub trait Command: Send {
    /// Apply this command to `doc`.
    fn apply(&mut self, doc: &mut Document) -> Result<()>;
    /// Reverse the effect of this command.
    fn revert(&mut self, doc: &mut Document) -> Result<()>;
    /// Human-readable name (for menus / debugging).
    fn name(&self) -> &str;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_document_has_background_layer() {
        let doc = Document::new(800, 600);
        assert_eq!(doc.width(), 800);
        assert_eq!(doc.height(), 600);
        assert_eq!(doc.layer_count(), 1);
    }
}
