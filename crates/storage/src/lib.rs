//! Storage engine — SQLite history database + file storage on disk.

#![forbid(unsafe_code)]

use better_shot_core::prelude::{Id, Screenshot};
use better_shot_core::Result;
use std::path::Path;

#[derive(Clone)]
pub struct Storage {
    conn: std::sync::Arc<parking_lot::Mutex<rusqlite::Connection>>,
}

pub fn add_screenshot(
    storage: &Storage,
    path: &str,
    width: u32,
    height: u32,
    byte_size: u32,
) -> Result<Screenshot> {
    let conn = storage.conn.lock();
    let id = Id::new();
    let created_at = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO screenshots (id, path, width, height, byte_size, created_at, favorited, tags) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, '[]')",
        rusqlite::params![id.to_string(), path, width, height, byte_size, created_at],
    )
    .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    Ok(Screenshot {
        id,
        path: path.to_string(),
        width,
        height,
        byte_size,
        created_at,
        favorited: false,
        tags: vec![],
    })
}

pub fn list_screenshots(storage: &Storage, limit: u32, offset: u32) -> Result<Vec<Screenshot>> {
    let conn = storage.conn.lock();
    let mut stmt = conn
        .prepare(
            "SELECT id, path, width, height, byte_size, created_at, favorited, tags FROM screenshots ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    let rows = stmt
        .query_map(rusqlite::params![limit, offset], |row| {
            let tags_raw: String = row.get(7).unwrap_or_default();
            let tags: Vec<String> = serde_json::from_str(&tags_raw).unwrap_or_default();
            Ok(Screenshot {
                id: Id(row.get(0).unwrap_or_default()),
                path: row.get(1).unwrap_or_default(),
                width: row.get(2).unwrap_or(0),
                height: row.get(3).unwrap_or(0),
                byte_size: row.get(4).unwrap_or(0),
                created_at: row.get(5).unwrap_or_default(),
                favorited: row.get::<_, i32>(6).unwrap_or(0) != 0,
                tags,
            })
        })
        .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    let mut results = Vec::new();
    for row in rows {
        let row = row.map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
        results.push(row);
    }
    Ok(results)
}

pub fn search_screenshots(storage: &Storage, query: &str) -> Result<Vec<Screenshot>> {
    let conn = storage.conn.lock();
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.path, s.width, s.height, s.byte_size, s.created_at, s.favorited, s.tags FROM screenshots s JOIN ocr_results o ON o.screenshot = s.id JOIN ocr_fts f ON f.rowid = o.rowid WHERE ocr_fts MATCH ?1 ORDER BY rank LIMIT 50",
        )
        .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    let rows = stmt
        .query_map([query], |row| {
            let tags_raw: String = row.get(7).unwrap_or_default();
            let tags: Vec<String> = serde_json::from_str(&tags_raw).unwrap_or_default();
            Ok(Screenshot {
                id: Id(row.get(0).unwrap_or_default()),
                path: row.get(1).unwrap_or_default(),
                width: row.get(2).unwrap_or(0),
                height: row.get(3).unwrap_or(0),
                byte_size: row.get(4).unwrap_or(0),
                created_at: row.get(5).unwrap_or_default(),
                favorited: row.get::<_, i32>(6).unwrap_or(0) != 0,
                tags,
            })
        })
        .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    let mut results = Vec::new();
    for row in rows {
        let row = row.map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
        results.push(row);
    }
    Ok(results)
}

pub fn favorite_screenshot(storage: &Storage, id: &str, favorited: bool) -> Result<()> {
    let conn = storage.conn.lock();
    conn.execute(
        "UPDATE screenshots SET favorited = ?1 WHERE id = ?2",
        rusqlite::params![favorited as i32, id],
    )
    .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    Ok(())
}

pub fn tag_screenshot(storage: &Storage, id: &str, tags: &[String]) -> Result<()> {
    let conn = storage.conn.lock();
    let tags_json = serde_json::to_string(tags)
        .map_err(|e| better_shot_core::AppError::Storage(format!("serialize tags: {}", e)))?;
    conn.execute(
        "UPDATE screenshots SET tags = ?1 WHERE id = ?2",
        rusqlite::params![tags_json, id],
    )
    .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    Ok(())
}

pub fn delete_screenshot(storage: &Storage, id: &str) -> Result<()> {
    let conn = storage.conn.lock();
    let path: String = conn
        .query_row("SELECT path FROM screenshots WHERE id = ?1", [id], |r| {
            r.get::<_, String>(0)
        })
        .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    conn.execute("DELETE FROM screenshots WHERE id = ?1", [id])
        .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
    drop(conn);
    let _ = std::fs::remove_file(&path);
    Ok(())
}

impl Storage {
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
        for (version, sql) in [
            (1, include_str!("../migrations/0001_init.sql")),
            (2, include_str!("../migrations/0002_history.sql")),
        ] {
            let exists: bool = conn
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version = ?",
                    [version],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap_or(0)
                > 0;
            if !exists {
                conn.execute_batch(sql)
                    .map_err(|e| better_shot_core::AppError::Storage(e.to_string()))?;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn in_memory_storage_opens() {
        let storage = Storage::in_memory().unwrap();
        drop(storage);
    }
}
