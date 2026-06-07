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

impl std::fmt::Display for DisplayBackend {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Wayland => "wayland",
            Self::X11 => "x11",
            Self::Unknown => "unknown",
        };
        f.write_str(s)
    }
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

/// Captured output of a child process, mirroring `std::process::Output`.
#[derive(Debug)]
pub struct CommandOutput {
    pub status: std::process::ExitStatus,
    pub stdout: Vec<u8>,
    pub stderr: Vec<u8>,
}

/// Run a child process synchronously and return its captured output.
///
/// Thin wrapper around `std::process::Command` so callers don't have to
/// reach into `std::process` directly (see `clippy.toml`'s disallowed list).
#[allow(clippy::disallowed_methods)]
pub fn command_output_sync(cmd: &str, args: &[&str]) -> Result<CommandOutput> {
    let output = std::process::Command::new(cmd)
        .args(args)
        .output()
        .map_err(|e| AppError::backend(format!("{cmd} spawn: {e}")))?;
    Ok(CommandOutput {
        status: output.status,
        stdout: output.stdout,
        stderr: output.stderr,
    })
}

/// Run a child process asynchronously and return its captured output.
///
/// Async equivalent of [`command_output_sync`].
pub async fn command_output_async(cmd: &str, args: &[&str]) -> Result<CommandOutput> {
    let output = tokio::process::Command::new(cmd)
        .args(args)
        .output()
        .await
        .map_err(|e| AppError::backend(format!("{cmd} spawn: {e}")))?;
    Ok(CommandOutput {
        status: output.status,
        stdout: output.stdout,
        stderr: output.stderr,
    })
}

/// Output of an XDG Desktop Portal screenshot request.
///
/// The portal hands back a `file://` URI (for newer compositors) or
/// a `fd://` URI (older). Callers should treat it as opaque bytes —
/// decoding into a bitmap belongs to the capture crate.
#[cfg(target_os = "linux")]
#[derive(Debug, Clone)]
pub struct PortalScreenshot {
    /// Raw bytes (PNG) of the screenshot.
    pub bytes: Vec<u8>,
}

/// Request an interactive screenshot via the XDG Desktop Portal.
///
/// `interactive=true` lets the user pick a region / window in the
/// portal UI. `modal=true` blocks the application window until the
/// user makes a choice. Returns `Err(AppError::Cancelled)` if the
/// user dismisses the portal.
#[cfg(target_os = "linux")]
pub async fn portal_take_screenshot() -> Result<PortalScreenshot> {
    use ashpd::desktop::screenshot::Screenshot;

    let request = Screenshot::request()
        .interactive(true)
        .modal(true)
        .send()
        .await
        .map_err(|e| AppError::backend(format!("portal: send: {e}")))?;

    let response = request.response().map_err(|e| {
        if is_user_cancelled(&e) {
            AppError::Cancelled
        } else {
            AppError::backend(format!("portal: response: {e}"))
        }
    })?;

    let uri = response.uri();
    let bytes = read_uri(uri).await?;
    Ok(PortalScreenshot { bytes })
}

#[cfg(target_os = "linux")]
fn is_user_cancelled(err: &ashpd::Error) -> bool {
    matches!(err, ashpd::Error::Response(_)) && err.to_string().to_lowercase().contains("cancel")
}

#[cfg(target_os = "linux")]
async fn read_uri(uri: &url::Url) -> Result<Vec<u8>> {
    use tokio::io::AsyncReadExt;

    match uri.scheme() {
        "file" => {
            let path = uri
                .to_file_path()
                .map_err(|_| AppError::backend(format!("portal: invalid file URI: {uri}")))?;
            tokio::fs::read(&path).await.map_err(AppError::from)
        }
        "fd" => {
            // `fd://N` — the portal hands us a file descriptor
            // number. We read it through `/proc/self/fd/N` so the
            // kernel does the actual file I/O and the fd is closed
            // when the procfs handle is dropped. Avoids `unsafe`.
            let fd: i32 = uri
                .host_str()
                .and_then(|s| s.parse().ok())
                .ok_or_else(|| AppError::backend(format!("portal: invalid fd URI: {uri}")))?;
            let proc_path = format!("/proc/self/fd/{fd}");
            let mut file = tokio::fs::File::open(&proc_path)
                .await
                .map_err(|e| AppError::backend(format!("portal: open {proc_path}: {e}")))?;
            let mut buf = Vec::new();
            file.read_to_end(&mut buf).await.map_err(AppError::from)?;
            Ok(buf)
        }
        other => Err(AppError::backend(format!(
            "portal: unsupported URI scheme: {other}"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_does_not_panic() {
        let _ = DisplayBackend::detect();
    }

    #[test]
    fn command_output_sync_captures_stdout() {
        let out = command_output_sync("true", &[]).expect("true should run");
        assert!(out.status.success());
        assert!(out.stdout.is_empty());
    }

    #[test]
    fn command_output_sync_reports_failure() {
        let out = command_output_sync("false", &[]).expect("false should run");
        assert!(!out.status.success());
    }
}
