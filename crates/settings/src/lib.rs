//! TOML persistence layer for [`AppConfig`].
//!
//! This crate owns how [`AppConfig`] is read from / written to
//! disk. The config struct itself lives in `better_shot_core::config`
//! so all engine crates can refer to it without depending on the
//! settings engine.

#![forbid(unsafe_code)]

use std::path::Path;

use better_shot_core::{AppConfig, Result};
use tracing::{debug, warn};

/// Read the user's [`AppConfig`] from `path`.
///
/// Returns [`AppConfig::default()`] if the file is missing.
/// On parse failure, logs a warning and falls back to defaults so the
/// app still boots — but only after a fresh file is written so the
/// user has a valid config to edit.
pub fn load(path: &Path) -> Result<AppConfig> {
    if !path.exists() {
        debug!(path = %path.display(), "no config file yet; using defaults");
        return Ok(AppConfig::default());
    }
    let raw = std::fs::read_to_string(path)?;
    match toml::from_str::<AppConfig>(&raw) {
        Ok(cfg) => Ok(cfg),
        Err(e) => {
            warn!(
                path = %path.display(),
                error = %e,
                "config parse failed; falling back to defaults"
            );
            Ok(AppConfig::default())
        }
    }
}

/// Persist `cfg` to `path`. Creates parent directories as needed.
pub fn save(path: &Path, cfg: &AppConfig) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let serialized = toml::to_string_pretty(cfg)
        .map_err(|e| better_shot_core::AppError::Config(e.to_string()))?;
    std::fs::write(path, serialized)?;
    Ok(())
}

/// Apply a partial patch on top of the current config.
///
/// `patch` is a full [`AppConfig`] shape (not a struct-update diff);
/// the caller is expected to fetch the current config with [`load`]
/// first. Field-level merging would require `Option<Option<T>>` for
/// "explicit null" which we don't need yet; revisit in M1.4.
///
/// `_current` is unused today but kept in the signature so the
/// function can grow into a real diff-merge without changing callers.
pub fn merge(_current: &AppConfig, patch: AppConfig) -> AppConfig {
    AppConfig {
        schema_version: patch.schema_version,
        locale: patch.locale,
        theme: patch.theme,
        default_save_dir: patch.default_save_dir,
        default_format: patch.default_format,
        tray_enabled: patch.tray_enabled,
        auto_start: patch.auto_start,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use better_shot_core::ImageFormat;
    use tempfile::tempdir;

    #[test]
    fn missing_file_returns_defaults() {
        let tmp = tempdir().unwrap();
        let path = tmp.path().join("config.toml");
        let cfg = load(&path).unwrap();
        assert_eq!(cfg, AppConfig::default());
    }

    #[test]
    fn roundtrip_preserves_all_fields() {
        let tmp = tempdir().unwrap();
        let path = tmp.path().join("config.toml");
        let original = AppConfig {
            locale: "vi".into(),
            theme: better_shot_core::Theme::Dark,
            default_save_dir: Some(std::path::PathBuf::from("/tmp/shots")),
            default_format: ImageFormat::WebP,
            ..AppConfig::default()
        };
        save(&path, &original).unwrap();
        let loaded = load(&path).unwrap();
        assert_eq!(loaded, original);
    }

    #[test]
    fn corrupted_file_falls_back_to_defaults() {
        let tmp = tempdir().unwrap();
        let path = tmp.path().join("config.toml");
        std::fs::write(&path, "this is = not valid [ toml").unwrap();
        let cfg = load(&path).unwrap();
        assert_eq!(cfg, AppConfig::default());
    }

    #[test]
    fn save_creates_parent_dirs() {
        let tmp = tempdir().unwrap();
        let path = tmp.path().join("nested/dir/config.toml");
        save(&path, &AppConfig::default()).unwrap();
        assert!(path.exists());
    }

    #[test]
    fn merge_replaces_every_field() {
        let current = AppConfig {
            locale: "en".into(),
            theme: better_shot_core::Theme::Light,
            ..AppConfig::default()
        };
        let patch = AppConfig {
            locale: "vi".into(),
            theme: better_shot_core::Theme::Dark,
            default_format: ImageFormat::Jpeg,
            ..current.clone()
        };
        let next = merge(&current, patch);
        assert_eq!(next.locale, "vi");
        assert_eq!(next.theme, better_shot_core::Theme::Dark);
        assert_eq!(next.default_format, ImageFormat::Jpeg);
        // Untouched fields carry through.
        assert_eq!(next.schema_version, current.schema_version);
    }
}
