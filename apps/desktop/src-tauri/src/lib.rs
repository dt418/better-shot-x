//! Better Shot Linux desktop application entry point.
//!
//! This crate is the Tauri 2 host that wires together all engine crates
//! (capture, editor, ocr, recording, storage, etc.) and exposes typed
//! commands to the React UI.

use std::sync::Arc;

use better_shot_core::prelude::AppConfig;
use better_shot_core::{AppPaths, Result};
use parking_lot::Mutex;
use tauri::{Manager, Runtime};
use tauri_specta::Builder as SpectaBuilder;
use tracing::{info, warn};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

pub mod commands;
pub mod error;
pub mod state;

pub use error::CmdResult;

/// Holds shared application state across all Tauri commands.
pub struct AppState {
    pub paths: AppPaths,
    pub settings: Arc<Mutex<AppConfig>>,
}

impl AppState {
    pub fn new(paths: AppPaths) -> Result<Self> {
        let settings = better_shot_settings::load(&paths.config_file())?;
        Ok(Self {
            paths,
            settings: Arc::new(Mutex::new(settings)),
        })
    }
}

/// Build the tauri-specta builder for all known commands.
///
/// Exposed publicly so the build script (`build.rs`) can call
/// `.export(...)` without duplicating the command list.
pub fn build_specta<R: Runtime>() -> SpectaBuilder<R> {
    SpectaBuilder::<R>::new().commands(tauri_specta::collect_commands![
        commands::health::ping,
        commands::settings::get_settings,
        commands::settings::update_settings,
    ])
}

/// Initialize structured logging to file + stderr.
///
/// Returns a [`WorkerGuard`] that must be held for the lifetime of the app
/// to ensure log writes are flushed on shutdown.
pub fn init_logging(paths: &AppPaths) -> Result<WorkerGuard> {
    std::fs::create_dir_all(paths.log_dir())?;
    let log_file = paths.log_dir().join("better-shot.log");

    let file_appender = tracing_appender::rolling::daily(paths.log_dir(), "better-shot.log");
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,better_shot=debug"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(
            fmt::layer()
                .with_target(true)
                .with_thread_ids(false)
                .with_line_number(true)
                .with_writer(file_writer)
                .with_ansi(false)
                .json(),
        )
        .with(fmt::layer().with_writer(std::io::stderr).compact())
        .try_init()
        .map_err(|e| better_shot_core::AppError::other(format!("log init: {e}")))?;

    info!(
        version = env!("CARGO_PKG_VERSION"),
        log_file = %log_file.display(),
        "Better Shot desktop starting"
    );

    Ok(guard)
}

/// Tauri application entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (paths, _guard) = match AppPaths::resolve().and_then(|p| {
        p.ensure_all()?;
        init_logging(&p).map(|g| (p, g))
    }) {
        Ok(pair) => pair,
        Err(e) => {
            eprintln!("FATAL: failed to initialize: {e}");
            std::process::exit(1);
        }
    };

    let specta = build_specta::<tauri::Wry>();

    // On debug builds, regenerate `apps/desktop/src/bindings.ts` so
    // the React UI always sees the latest command signatures.
    #[cfg(debug_assertions)]
    {
        if let Err(e) = specta.export(
            specta_typescript::Typescript::default(),
            "../src/bindings.ts",
        ) {
            warn!("specta export failed: {e}");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app| {
            let state = AppState::new(paths)?;

            // System tray
            if let Err(e) = better_shot_tray::init(app.handle()) {
                warn!("tray init failed: {e}");
            }

            // Global shortcuts
            if let Err(e) = commands::shortcuts::register(app.handle(), &state) {
                warn!("shortcut registration failed: {e}");
            }

            app.manage(state);
            Ok(())
        })
        .invoke_handler(specta.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running Better Shot desktop");
}

#[cfg(test)]
mod tests {
    use super::*;
    use better_shot_core::Theme;

    /// `AppState::new` must succeed against a fresh temp directory
    /// and expose the default config snapshot.
    #[test]
    fn app_state_loads_defaults_from_empty_dir() {
        let tmp = tempfile::tempdir().unwrap();
        let paths = AppPaths::at(tmp.path());
        paths.ensure_all().unwrap();
        let state = AppState::new(paths).unwrap();
        let snapshot = state.settings.lock().clone();
        assert_eq!(snapshot.locale, "en");
        assert_eq!(snapshot.theme, Theme::System);
    }

    /// `AppState::new` must read an existing TOML file, not silently
    /// overwrite it.
    #[test]
    fn app_state_reads_existing_config() {
        let tmp = tempfile::tempdir().unwrap();
        let paths = AppPaths::at(tmp.path());
        paths.ensure_all().unwrap();
        let custom = AppConfig {
            locale: "vi".into(),
            theme: Theme::Dark,
            ..AppConfig::default()
        };
        better_shot_settings::save(&paths.config_file(), &custom).unwrap();

        let state = AppState::new(paths).unwrap();
        let snapshot = state.settings.lock().clone();
        assert_eq!(snapshot.locale, "vi");
        assert_eq!(snapshot.theme, Theme::Dark);
    }
}
