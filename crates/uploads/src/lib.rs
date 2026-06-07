//! Upload engine — S3, Cloudflare R2, MinIO, SFTP, WebDAV providers.
//!
//! Credentials are stored in the OS keyring; never written to plaintext
//! config files.

#![forbid(unsafe_code)]

use better_shot_core::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;
use url::Url;

/// Supported upload provider kinds.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    /// Amazon S3 and S3-compatible (R2, MinIO, Wasabi).
    S3,
    /// WebDAV (Nextcloud, ownCloud, generic).
    WebDav,
    /// SSH File Transfer Protocol.
    Sftp,
}

/// Provider configuration (no secrets — those live in keyring).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub kind: ProviderKind,
    pub name: String,
    pub endpoint: Option<Url>,
    pub bucket: Option<String>,
    pub public_url_template: Option<String>,
}

/// Result of a successful upload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub provider: String,
    pub url: Url,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Trait implemented by every upload provider.
#[async_trait::async_trait]
pub trait UploadProvider: Send + Sync {
    fn kind(&self) -> ProviderKind;
    fn name(&self) -> &str;
    async fn upload(&self, local: &Path) -> Result<UploadResult>;
}

/// Upload a file to a configured provider.
pub async fn upload(_provider: &str, _local: &Path) -> Result<UploadResult> {
    // TODO (Milestone 7).
    Err(better_shot_core::AppError::Upload(
        "uploads not yet implemented (Milestone 7)".to_string(),
    ))
}
