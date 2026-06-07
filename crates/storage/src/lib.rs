//! Storage engine — SQLite history database + file storage on disk.

#![forbid(unsafe_code)]

use better_shot_core::Result;
use std::path::Path;

/// Storage handle (cheap to clone — wraps an `Arc` internally).
#[derive(Clone)]
pub struct Storage {
    conn: std::sync::Arc<parking_lot::Mutex<rusqlite::Connection>>,
}

impl Storage {
    /// Open or create a database at `db_path`.
    pub fn open(db_path: &Path) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = rusqlite::Connection::open(db_path)?;
        let storage = Self {
            conn: std::sync::Arc::new(parking_lot::Mutex::new(conn)),
        };
        storage.run_migrations()?;
        Ok(storage)
    }

    /// Open an in-memory database (for tests).
    pub fn in_memory() -> Result<Self> {
        let conn = rusqlite::Connection::open_in_memory()?;
        let storage = Self {
            conn: std::sync::Arc::new(parking_lot::Mutex::new(conn)),
        };
        storage.run_migrations()?;
        Ok(storage)
    }

    fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute_batch(include_str!("../migrations/0001_init.sql"))
            .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn in_memory_storage_opens() {
        let storage = Storage::in_memory().unwrap();
        // Should not panic, no schema assertions yet (migrations pending).
        drop(storage);
    }
}
