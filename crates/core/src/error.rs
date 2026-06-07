//! Application-wide error type.

use thiserror::Error;

/// Crate-wide [`Result`] alias.
pub type Result<T> = std::result::Result<T, AppError>;

/// All errors produced by Better Shot engines.
///
/// Each variant carries a user-facing message and (where applicable) the
/// underlying source error. Engines must return these — never `anyhow`
/// — at API boundaries.
#[derive(Debug, Error)]
pub enum AppError {
    /// Filesystem operation failed.
    #[error("filesystem error: {0}")]
    Io(#[from] std::io::Error),

    /// Serialization/deserialization failed.
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    /// Storage (SQLite) operation failed.
    #[error("storage error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    /// Image processing failed.
    #[error("image error: {0}")]
    Image(#[from] ::image::ImageError),

    /// A required dependency or tool is missing on the host system.
    #[error("missing dependency: {0}")]
    MissingDependency(String),

    /// Backend (Wayland/X11/Portal) reported an error.
    #[error("backend error: {0}")]
    Backend(String),

    /// Storage (SQLite) operation failed.
    #[error("storage error: {0}")]
    Storage(String),

    /// OCR engine failed.
    #[error("ocr error: {0}")]
    Ocr(String),

    /// Recording engine failed.
    #[error("recording error: {0}")]
    Recording(String),

    /// Upload to a remote provider failed.
    #[error("upload error: {0}")]
    Upload(String),

    /// Sync engine failed.
    #[error("sync error: {0}")]
    Sync(String),

    /// Plugin loading or execution failed.
    #[error("plugin error: {0}")]
    Plugin(String),

    /// Configuration is invalid.
    #[error("invalid configuration: {0}")]
    Config(String),

    /// A user-facing validation failure.
    #[error("validation error: {0}")]
    Validation(String),

    /// The user cancelled the operation.
    #[error("cancelled by user")]
    Cancelled,

    /// Permission denied by the OS / desktop environment.
    #[error("permission denied: {0}")]
    PermissionDenied(String),

    /// Operation timed out.
    #[error("timeout: {0}")]
    Timeout(String),

    /// Catch-all for uncategorized failures.
    #[error("{0}")]
    Other(String),
}

impl AppError {
    /// Construct a backend error with a formatted message.
    pub fn backend(msg: impl Into<String>) -> Self {
        Self::Backend(msg.into())
    }

    /// Construct an "other" error with a formatted message.
    pub fn other(msg: impl Into<String>) -> Self {
        Self::Other(msg.into())
    }

    /// Returns true if this error indicates the user cancelled the operation.
    pub fn is_cancelled(&self) -> bool {
        matches!(self, Self::Cancelled)
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        Self::Other(format!("{e:#}"))
    }
}
