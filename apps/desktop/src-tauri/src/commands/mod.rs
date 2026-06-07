//! Tauri command handlers.
//!
//! Each submodule groups related commands. All commands return
//! `Result<T, AppError>` and use the shared [`AppState`].

pub mod capture;
pub mod health;
pub mod settings;
pub mod shortcuts;
