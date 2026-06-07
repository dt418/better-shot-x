//! Canonical application configuration.
//!
//! [`AppConfig`] is the single source of truth for user-visible
//! preferences. The TOML persistence layer lives in
//! `better_shot_settings`; per-section config types (when they
//! appear) live in the engine crate that owns them.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::types::ImageFormat;

/// Schema version of the on-disk TOML config.
///
/// Bump this whenever a breaking change is made to [`AppConfig`] and
/// add a migration step in `better_shot_settings`.
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

/// Top-level application configuration persisted as TOML.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(default, deny_unknown_fields)]
pub struct AppConfig {
    /// Schema version for forward-compat migrations.
    pub schema_version: u32,

    /// Default UI locale (e.g. `"en"`, `"vi"`, `"zh-CN"`).
    pub locale: String,

    /// Theme preference.
    pub theme: Theme,

    /// Default screenshot save location override.
    /// `None` means "use the platform default" (`AppPaths::screenshots_dir()`).
    pub default_save_dir: Option<PathBuf>,

    /// Default image format for new screenshots.
    pub default_format: ImageFormat,

    /// Whether the system tray icon is shown at startup.
    pub tray_enabled: bool,

    /// Whether the app should launch on login.
    pub auto_start: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            locale: "en".to_string(),
            theme: Theme::System,
            default_save_dir: None,
            default_format: ImageFormat::Png,
            tray_enabled: true,
            auto_start: false,
        }
    }
}

impl AppConfig {
    /// Construct a config with all fields explicitly overridden by
    /// the given closure. Used by tests and the merge helper.
    pub fn with<R>(&self, f: impl FnOnce(&mut Self) -> R) -> (Self, R) {
        let mut next = self.clone();
        let r = f(&mut next);
        (next, r)
    }
}

/// Light / dark / system theme preference.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    /// Light mode.
    Light,
    /// Dark mode.
    Dark,
    /// Follow the system preference.
    #[default]
    System,
}

impl Theme {
    /// Parse from the legacy `String` representation persisted by
    /// pre-M1.0 configs.
    pub fn from_legacy_str(s: &str) -> Self {
        match s.to_ascii_lowercase().as_str() {
            "light" => Self::Light,
            "dark" => Self::Dark,
            _ => Self::System,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_matches_current_schema() {
        let cfg = AppConfig::default();
        assert_eq!(cfg.schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(cfg.locale, "en");
        assert_eq!(cfg.theme, Theme::System);
        assert_eq!(cfg.default_format, ImageFormat::Png);
        assert!(cfg.tray_enabled);
        assert!(!cfg.auto_start);
        assert!(cfg.default_save_dir.is_none());
    }

    #[test]
    fn roundtrip_toml_preserves_all_fields() {
        let original = AppConfig {
            schema_version: 2,
            locale: "vi".into(),
            theme: Theme::Dark,
            default_save_dir: Some(PathBuf::from("/tmp/shots")),
            default_format: ImageFormat::WebP,
            tray_enabled: false,
            auto_start: true,
        };
        let raw = toml::to_string(&original).unwrap();
        let parsed: AppConfig = toml::from_str(&raw).unwrap();
        assert_eq!(original, parsed);
    }

    #[test]
    fn missing_fields_fall_back_to_defaults() {
        // `schema_version` and friends are all defaulted via `#[serde(default)]`.
        let raw = r#"
            locale = "zh-CN"
            theme = "dark"
        "#;
        let cfg: AppConfig = toml::from_str(raw).unwrap();
        assert_eq!(cfg.locale, "zh-CN");
        assert_eq!(cfg.theme, Theme::Dark);
        assert_eq!(cfg.default_format, ImageFormat::Png);
        assert!(cfg.tray_enabled);
    }

    #[test]
    fn theme_legacy_parse_handles_known_values() {
        assert_eq!(Theme::from_legacy_str("light"), Theme::Light);
        assert_eq!(Theme::from_legacy_str("DARK"), Theme::Dark);
        assert_eq!(Theme::from_legacy_str("System"), Theme::System);
        assert_eq!(Theme::from_legacy_str("garbage"), Theme::System);
    }

    #[test]
    fn with_helper_returns_modified_config() {
        let cfg = AppConfig::default();
        let (updated, prev_tray) = cfg.with(|c| {
            let prev = c.tray_enabled;
            c.tray_enabled = false;
            c.locale = "vi".into();
            prev
        });
        assert!(!updated.tray_enabled);
        assert_eq!(updated.locale, "vi");
        // Original untouched.
        assert!(cfg.tray_enabled);
        assert!(prev_tray);
    }

    #[test]
    fn unknown_fields_are_rejected() {
        // `deny_unknown_fields` makes typos surface instead of silently
        // round-tripping wrong values.
        let raw = r#"
            locale = "en"
            theme = "light"
            not_a_real_field = true
        "#;
        let res: Result<AppConfig, _> = toml::from_str(raw);
        assert!(res.is_err());
    }
}
