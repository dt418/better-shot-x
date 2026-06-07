//! Better Shot Linux desktop application entry point.
//!
//! This crate is the Tauri 2 host that wires together all engine crates
//! (capture, editor, ocr, recording, storage, etc.) and exposes typed
//! commands to the React UI.

use std::sync::Arc;

use better_shot_core::error::Result;
use better_shot_core::AppPaths;
use parking_lot::Mutex;
use tauri::Manager;
use tracing::{info, warn};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

mod commands;
mod error;
mod state;

/// Holds shared application state across all Tauri commands.
pub struct AppState {
    pub paths: AppPaths,
    pub settings: Arc<Mutex<better_shot_settings::Settings>>,
    // Engines will be injected here as they are implemented.
}

impl AppState {
    pub fn new(paths: AppPaths) -> Result<Self> {
        let settings = better_shot_settings::Settings::load(&paths.config_file())?;
        Ok(Self {
            paths,
            settings: Arc::new(Mutex::new(settings)),
        })
    }
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
        .map_err(|e| better_shot_core::error::AppError::Other(format!("log init: {e}")))?;

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
    let _guard = match AppPaths::resolve().and_then(|p| init_logging(&p)) {
        Ok(g) => g,
        Err(e) => {
            eprintln!("FATAL: failed to initialize: {e}");
            std::process::exit(1);
        }
    };

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
        .setup(|app| {
            let paths = AppPaths::resolve()?;
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
        .invoke_handler(tauri::generate_handler![
            commands::health::ping,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Better Shot desktop");
}
