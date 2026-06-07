//! Better Shot core crate.
//!
//! Provides shared types, error definitions, application path resolution,
//! and cross-cutting primitives used by every engine crate.

#![forbid(unsafe_code)]

pub mod config;
pub mod error;
pub mod paths;
pub mod types;

pub use error::{AppError, Result};
pub use paths::AppPaths;

pub mod prelude {
    //! Re-exports of the most commonly used items.
    pub use crate::error::{AppError, Result};
    pub use crate::paths::AppPaths;
    pub use crate::types::{ImageFormat, Rect, Size};
}
