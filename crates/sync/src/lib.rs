//! Self-hosted sync engine.
//!
//! v1 supports folder-based sync (Syncthing/Nextcloud/Dropbox compatible)
//! and WebDAV targets. E2E encryption is optional via the `age` crate.

#![forbid(unsafe_code)]

use better_shot_core::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Sync backend type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncBackend {
    /// A local folder managed by an external sync tool.
    Folder,
    /// WebDAV (Nextcloud, ownCloud, generic).
    WebDav,
}

/// Sync target configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTarget {
    pub backend: SyncBackend,
    /// For [`SyncBackend::Folder`], the local path.
    pub folder: Option<PathBuf>,
    /// For [`SyncBackend::WebDav`], the endpoint URL.
    pub webdav_url: Option<url::Url>,
    pub webdav_username: Option<String>,
}

/// Sync status report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncReport {
    pub last_sync: chrono::DateTime<chrono::Utc>,
    pub uploaded: u64,
    pub downloaded: u64,
    pub conflicts: u32,
}

/// Run a sync cycle against the configured target.
pub async fn run_sync_cycle(_target: &SyncTarget) -> Result<SyncReport> {
    // TODO (Milestone 8).
    Err(better_shot_core::AppError::Sync(
        "sync not yet implemented (Milestone 8)".to_string(),
    ))
}
