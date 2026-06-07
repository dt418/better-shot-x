//! Application configuration primitives.
//!
//! Top-level config struct is defined here; per-section types live in
//! the engine crates that own them. The [`AppConfig`] glues them
//! together with sane defaults.

use serde::{Deserialize, Serialize};

/// Top-level application configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    /// Schema version for migrations.
    pub schema_version: u32,

    /// Default language code (e.g. `en`, `vi`, `zh-CN`).
    pub locale: String,

    /// Theme preference.
    pub theme: Theme,
}

/// Light/dark/auto theme.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    /// Light mode.
    Light,
    /// Dark mode.
    Dark,
    /// Follow the system preference.
    System,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            schema_version: 1,
            locale: "en".to_string(),
            theme: Theme::System,
        }
    }
}
