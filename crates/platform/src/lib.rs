//! Linux platform layer.
//!
//! Encapsulates all direct interaction with Wayland / X11 / DBus /
//! D-Bus-activated portals. UI and engine crates depend on this —
//! never on the underlying libraries directly.

#![forbid(unsafe_code)]

use better_shot_core::{AppError, Result};

/// Detected desktop environment / windowing system.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DisplayBackend {
    /// Wayland compositor (GNOME, KDE, Sway, Hyprland, COSMIC, …).
    Wayland,
    /// X11 server.
    X11,
    /// Could not be determined; assume portals fallback.
    Unknown,
}

impl DisplayBackend {
    /// Detect the active backend at runtime.
    pub fn detect() -> Self {
        if std::env::var_os("WAYLAND_DISPLAY").is_some() {
            Self::Wayland
        } else if std::env::var_os("DISPLAY").is_some() {
            Self::X11
        } else {
            Self::Unknown
        }
    }
}

/// Probe whether a CLI tool is available on `$PATH`.
pub fn which(tool: &str) -> Result<std::path::PathBuf> {
    which::which(tool).map_err(|e| AppError::MissingDependency(format!("{tool}: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_does_not_panic() {
        let _ = DisplayBackend::detect();
    }
}
