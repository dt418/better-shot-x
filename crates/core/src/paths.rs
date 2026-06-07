//! XDG-style application path resolution.

use std::path::{Path, PathBuf};

use directories::ProjectDirs;

use crate::error::Result;

/// Resolved paths for the Better Shot application.
///
/// All paths follow the XDG Base Directory specification on Linux.
#[derive(Debug, Clone)]
pub struct AppPaths {
    base: PathBuf,
}

impl AppPaths {
    /// Resolve the canonical paths for the current user.
    pub fn resolve() -> Result<Self> {
        let dirs = ProjectDirs::from("app", "bettershot", "Better Shot")
            .ok_or_else(|| crate::error::AppError::other("could not resolve home directory"))?;
        Ok(Self {
            base: dirs.data_dir().to_path_buf(),
        })
    }

    /// Construct paths rooted at a custom base directory (for tests).
    pub fn at(base: impl Into<PathBuf>) -> Self {
        Self { base: base.into() }
    }

    /// Application data directory (screenshots, DB, models).
    pub fn data_dir(&self) -> &Path {
        &self.base
    }

    /// User-level config file (TOML).
    pub fn config_file(&self) -> PathBuf {
        self.config_dir().join("config.toml")
    }

    /// User-level config directory.
    pub fn config_dir(&self) -> PathBuf {
        self.base.join("config")
    }

    /// Log directory (rotated daily).
    pub fn log_dir(&self) -> PathBuf {
        self.base.join("logs")
    }

    /// Cache directory.
    pub fn cache_dir(&self) -> PathBuf {
        self.base.join("cache")
    }

    /// Default screenshot storage directory.
    pub fn screenshots_dir(&self) -> PathBuf {
        self.base.join("screenshots")
    }

    /// Default recording storage directory.
    pub fn recordings_dir(&self) -> PathBuf {
        self.base.join("recordings")
    }

    /// Local OCR model files.
    pub fn models_dir(&self) -> PathBuf {
        self.base.join("models")
    }

    /// SQLite database file.
    pub fn database_file(&self) -> PathBuf {
        self.base.join("better-shot.db")
    }

    /// Plugins directory (user-installed).
    pub fn plugins_dir(&self) -> PathBuf {
        self.base.join("plugins")
    }

    /// Sync working directory.
    pub fn sync_dir(&self) -> PathBuf {
        self.base.join("sync")
    }

    /// Ensure all standard directories exist.
    pub fn ensure_all(&self) -> Result<()> {
        for dir in [
            self.data_dir(),
            self.config_dir().as_path(),
            self.log_dir().as_path(),
            self.cache_dir().as_path(),
            self.screenshots_dir().as_path(),
            self.recordings_dir().as_path(),
            self.models_dir().as_path(),
            self.plugins_dir().as_path(),
            self.sync_dir().as_path(),
        ] {
            std::fs::create_dir_all(dir)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_all_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        let paths = AppPaths::at(tmp.path());
        paths.ensure_all().unwrap();
        assert!(paths.data_dir().exists());
        assert!(paths.config_dir().exists());
        assert!(paths.log_dir().exists());
        assert!(paths.screenshots_dir().exists());
    }

    #[test]
    fn config_file_lives_in_config_dir() {
        let tmp = tempfile::tempdir().unwrap();
        let paths = AppPaths::at(tmp.path());
        assert_eq!(paths.config_file().parent().unwrap(), paths.config_dir());
    }
}
