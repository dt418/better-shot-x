//! Capture backend implementations.

mod grim_slurp;
mod portal;
mod screenshots_rs;

pub use grim_slurp::GrimSlurpBackend;
pub use portal::PortalBackend;
pub use screenshots_rs::ScreenshotsRsBackend;
