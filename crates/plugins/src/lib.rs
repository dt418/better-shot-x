//! Plugin system — WASM-based, capability-sandboxed extensions.
//!
//! v1 stable API surface is documented in `docs/plugin-dev/`.

#![forbid(unsafe_code)]

use better_shot_core::Result;
use serde::{Deserialize, Serialize};

/// Plugin manifest — loaded from `plugin.toml` next to the WASM module.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub plugin: PluginInfo,
    pub capabilities: PluginCapabilities,
}

/// Identity and metadata fields.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    /// Plugin API version this plugin targets (e.g. `"1"`).
    pub api_version: String,
    pub author: String,
    pub license: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub homepage: Option<String>,
}

/// Declared capabilities enforced at load time.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PluginCapabilities {
    #[serde(default)]
    pub filesystem: Vec<FsCapability>,
    #[serde(default)]
    pub network: Vec<NetCapability>,
    #[serde(default)]
    pub capture: Vec<CaptureCapability>,
    #[serde(default)]
    pub editor: Vec<EditorCapability>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FsCapability {
    Read,
    Write,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NetCapability {
    Upload,
    Download,
    Listener,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CaptureCapability {
    Region,
    Fullscreen,
    Window,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EditorCapability {
    Tool,
    Filter,
    Export,
}

/// Load and validate a plugin from a manifest + WASM module path.
pub fn load(_manifest: &PluginManifest, _wasm_path: &std::path::Path) -> Result<()> {
    // TODO (Milestone 8).
    Ok(())
}
