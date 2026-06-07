//! Recording engine — screen recording, GIF export.
//!
//! Backends: `wf-recorder` (Wayland), `ffmpeg` (universal), native Rust (Phase 3).

#![forbid(unsafe_code)]

use better_shot_core::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Output video codec.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Codec {
    /// VP9 (open, high compression).
    Vp9,
    /// AV1 (next-gen, hardware-accelerated).
    Av1,
    /// H.264 (broad compat, requires openH264).
    H264,
    /// Animated GIF (for short clips).
    Gif,
}

/// Recording state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecordingState {
    /// Not recording.
    Idle,
    /// Currently recording.
    Recording,
    /// Paused.
    Paused,
}

/// Handle to an in-progress recording.
#[derive(Debug, Clone)]
pub struct Recording {
    id: Uuid,
    state: RecordingState,
    started_at: chrono::DateTime<chrono::Utc>,
}

impl Recording {
    /// Current state.
    pub fn state(&self) -> RecordingState {
        self.state
    }

    /// Recording ID.
    pub fn id(&self) -> Uuid {
        self.id
    }

    /// Wall-clock time the recording was started.
    pub fn started_at(&self) -> chrono::DateTime<chrono::Utc> {
        self.started_at
    }
}

/// Start a fullscreen recording.
pub async fn start_fullscreen(_codec: Codec) -> Result<Recording> {
    // TODO (Milestone 6): wire wf-recorder / ffmpeg.
    Err(better_shot_core::AppError::Recording(
        "recording not yet implemented (Milestone 6)".to_string(),
    ))
}
