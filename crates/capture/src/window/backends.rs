use super::{WindowId, WindowInfo};
use better_shot_core::prelude::Rect;
use better_shot_core::{AppError, Result};
use better_shot_platform::{command_output_async, command_output_sync, DisplayBackend};
use std::future::Future;
use std::pin::Pin;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

pub fn window_backend() -> Box<dyn WindowCaptureBackend> {
    let display_mode = DisplayBackend::detect();
    tracing::info!(backend = %display_mode, "selecting window capture backend");

    match display_mode {
        DisplayBackend::Wayland => {
            if better_shot_platform::which("swaymsg").is_ok() {
                Box::new(GrimWindowBackend)
            } else {
                Box::new(XDotoolBackend)
            }
        }
        DisplayBackend::X11 => Box::new(XDotoolBackend),
        DisplayBackend::Unknown => Box::new(XDotoolBackend),
    }
}

pub trait WindowCaptureBackend: Send + Sync {
    fn list_windows(&self) -> Result<Vec<WindowInfo>>;
    fn capture<'a>(&self, id: &'a WindowId) -> BoxFuture<'a, Result<crate::Capture>>;
}

impl<W: WindowCaptureBackend + ?Sized> WindowCaptureBackend for Box<W> {
    fn list_windows(&self) -> Result<Vec<WindowInfo>> {
        (**self).list_windows()
    }

    fn capture<'a>(&self, id: &'a WindowId) -> BoxFuture<'a, Result<crate::Capture>> {
        (**self).capture(id)
    }
}

pub struct GrimWindowBackend;

impl WindowCaptureBackend for GrimWindowBackend {
    fn list_windows(&self) -> Result<Vec<WindowInfo>> {
        Err(AppError::backend("grim does not support window listing"))
    }

    fn capture<'a>(&self, id: &'a WindowId) -> BoxFuture<'a, Result<crate::Capture>> {
        Box::pin(async move {
            better_shot_platform::which("grim")?;
            let output =
                command_output_async("grim", &["-t", "png", "-w", id.as_str(), "-"]).await?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(AppError::backend(format!("grim failed: {}", stderr.trim())));
            }

            let img = image::load_from_memory(&output.stdout)
                .map_err(|e| AppError::backend(format!("decode window capture: {e}")))?;

            let rgba = img.to_rgba8();
            let (width, height) = rgba.dimensions();

            Ok(crate::Capture {
                pixels: rgba.into_raw(),
                width,
                height,
            })
        })
    }
}

pub struct XDotoolBackend;

impl WindowCaptureBackend for XDotoolBackend {
    fn list_windows(&self) -> Result<Vec<WindowInfo>> {
        better_shot_platform::which("xdotool")?;

        let output = command_output_sync(
            "xdotool",
            &["search", "--onlyvisible", "--name", ".*", "--limit", "500"],
        )?;

        if !output.status.success() {
            return Err(AppError::backend("xdotool search failed"));
        }

        let window_ids: Vec<u64> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|l| l.trim().parse().ok())
            .collect();

        let mut windows = Vec::new();
        for wid in window_ids {
            if let Some(info) = get_window_info(wid) {
                windows.push(info);
            }
        }

        windows.sort_by(|a, b| a.title.cmp(&b.title));
        windows.dedup_by(|a, b| a.id == b.id);

        Ok(windows)
    }

    fn capture<'a>(&self, id: &'a WindowId) -> BoxFuture<'a, Result<crate::Capture>> {
        Box::pin(async move {
            better_shot_platform::which("xdotool")?;
            better_shot_platform::which("scrot")?;

            let output =
                command_output_async("xdotool", &["windowfocus", "--sync", id.as_str()]).await?;

            if !output.status.success() {
                return Err(AppError::backend("window not found or cannot be focused"));
            }

            let output =
                command_output_async("scrot", &["--focused", "-e", "mv $f /dev/stdout"]).await?;

            if !output.status.success() {
                return Err(AppError::backend("scrot focused capture failed"));
            }

            let img = image::load_from_memory(&output.stdout)
                .map_err(|e| AppError::backend(format!("decode window capture: {e}")))?;

            let rgba = img.to_rgba8();
            let (width, height) = rgba.dimensions();

            Ok(crate::Capture {
                pixels: rgba.into_raw(),
                width,
                height,
            })
        })
    }
}

fn get_window_info(wid: u64) -> Option<WindowInfo> {
    let title = get_xprop(wid, "WM_NAME").or_else(|| get_xprop(wid, "_NET_WM_NAME"))?;
    if title.trim().is_empty() {
        return None;
    }

    let app_name = get_xprop(wid, "WM_CLASS")
        .map(|s| s.split(',').next().unwrap_or(&s).to_string())
        .unwrap_or_default();

    let geometry = get_window_geometry(wid).unwrap_or(Rect {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });

    Some(WindowInfo {
        id: WindowId(wid.to_string()),
        title: title.trim().to_string(),
        app_name,
        geometry,
    })
}

fn get_xprop(wid: u64, prop: &str) -> Option<String> {
    let output = command_output_sync("xprop", &["-id", &wid.to_string(), prop]).ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let after_eq = stdout.split('=').nth(1)?.trim();

    if after_eq == "\"\"" || after_eq.is_empty() {
        return None;
    }

    let stripped = after_eq.trim_matches('"').trim_matches('\'').to_string();
    if stripped.is_empty() {
        None
    } else {
        Some(stripped)
    }
}

fn get_window_geometry(wid: u64) -> Option<Rect> {
    let output = command_output_sync(
        "xdotool",
        &["getwindowgeometry", "--shell", &wid.to_string()],
    )
    .ok()?;

    if !output.status.success() {
        return None;
    }

    parse_geometry_shell(&String::from_utf8_lossy(&output.stdout))
}

/// Parse the `KEY=VALUE` lines emitted by `xdotool getwindowgeometry --shell`.
///
/// `xdotool` (with `--shell`) prints one variable per line, e.g.:
///
/// ```text
/// X=10
/// Y=20
/// WIDTH=300
/// HEIGHT=400
/// SCREEN=0
/// WINDOW=12345
/// ```
///
/// Returns `None` when `WIDTH` or `HEIGHT` is missing/zero, or when
/// any of the integers fails to parse. Unknown keys are ignored.
fn parse_geometry_shell(raw: &str) -> Option<Rect> {
    let mut x: i32 = 0;
    let mut y: i32 = 0;
    let mut width: u32 = 0;
    let mut height: u32 = 0;

    for line in raw.lines() {
        let (key, val) = line.split_once('=')?;
        let val = val.trim();
        match key {
            "X" => x = val.parse().ok()?,
            "Y" => y = val.parse().ok()?,
            "WIDTH" => width = val.parse().ok()?,
            "HEIGHT" => height = val.parse().ok()?,
            _ => {}
        }
    }

    if width == 0 || height == 0 {
        return None;
    }

    Some(Rect {
        x: x.max(0),
        y: y.max(0),
        width,
        height,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_geometry_shell_happy_path() {
        let raw = "X=10\nY=20\nWIDTH=300\nHEIGHT=400\nSCREEN=0\nWINDOW=12345\n";
        let rect = parse_geometry_shell(raw).expect("should parse");
        assert_eq!(
            rect,
            Rect {
                x: 10,
                y: 20,
                width: 300,
                height: 400
            }
        );
    }

    #[test]
    fn parse_geometry_shell_missing_width_returns_none() {
        let raw = "X=10\nY=20\nHEIGHT=400\n";
        assert!(parse_geometry_shell(raw).is_none());
    }

    #[test]
    fn parse_geometry_shell_zero_size_returns_none() {
        let raw = "X=0\nY=0\nWIDTH=0\nHEIGHT=0\n";
        assert!(parse_geometry_shell(raw).is_none());
    }

    #[test]
    fn parse_geometry_shell_clamps_negative_coords() {
        let raw = "X=-50\nY=-10\nWIDTH=100\nHEIGHT=200\n";
        let rect = parse_geometry_shell(raw).expect("should parse");
        assert_eq!(rect.x, 0, "negative X must clamp to 0");
        assert_eq!(rect.y, 0, "negative Y must clamp to 0");
    }

    #[test]
    fn parse_geometry_shell_bad_int_returns_none() {
        let raw = "X=abc\nY=20\nWIDTH=100\nHEIGHT=200\n";
        assert!(parse_geometry_shell(raw).is_none());
    }

    #[test]
    fn parse_geometry_shell_unknown_keys_ignored() {
        let raw = "X=1\nY=2\nWIDTH=3\nHEIGHT=4\nSCREEN=0\nWINDOW=99\n";
        let rect = parse_geometry_shell(raw).expect("should parse");
        assert_eq!(rect.width, 3);
        assert_eq!(rect.height, 4);
    }

    #[test]
    fn parse_geometry_shell_empty_returns_none() {
        assert!(parse_geometry_shell("").is_none());
    }
}
