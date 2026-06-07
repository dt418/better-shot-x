//! Settings engine — TOML config with migration support.

#![forbid(unsafe_code)]

use std::path::Path;

use better_shot_core::Result;
use serde::{Deserialize, Serialize};

/// Top-level settings, persisted as TOML.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// Schema version for forward-compat migrations.
    pub schema_version: u32,
    /// Default UI locale (e.g. `"en"`, `"vi"`, `"zh-CN"`).
    pub locale: String,
    /// Theme preference: `"light"`, `"dark"`, `"system"`.
    pub theme: String,
    /// Default screenshot save location override.
    pub default_save_dir: Option<std::path::PathBuf>,
    /// Default image format for new screenshots.
    pub default_format: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            locale: "en".to_string(),
            theme: "system".to_string(),
            default_save_dir: None,
            default_format: "png".to_string(),
        }
    }
}

impl Settings {
    /// Load settings from `path`, falling back to defaults if missing.
    pub fn load(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }
        let raw = std::fs::read_to_string(path)?;
        let settings: Self =
            toml::from_str(&raw).map_err(|e| better_shot_core::AppError::Config(e.to_string()))?;
        Ok(settings)
    }

    /// Persist settings to `path` (creates parent directories as needed).
    pub fn save(&self, path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let serialized = toml::to_string_pretty(self)
            .map_err(|e| better_shot_core::AppError::Config(e.to_string()))?;
        std::fs::write(path, serialized)?;
        Ok(())
    }

    /// Merge `other` into `self` (other wins on scalar fields).
    pub fn merge(&mut self, other: Settings) {
        if other.schema_version != 1 {
            self.schema_version = other.schema_version;
        }
        if other.locale != Self::default().locale {
            self.locale = other.locale;
        }
        if other.theme != Self::default().theme {
            self.theme = other.theme;
        }
        if other.default_save_dir.is_some() {
            self.default_save_dir = other.default_save_dir;
        }
        if other.default_format != Self::default().default_format {
            self.default_format = other.default_format;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("config.toml");
        let s = Settings::default();
        s.save(&path).unwrap();
        let loaded = Settings::load(&path).unwrap();
        assert_eq!(s.locale, loaded.locale);
        assert_eq!(s.theme, loaded.theme);
    }
}
