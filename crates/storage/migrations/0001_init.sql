-- Better Shot initial schema (Milestone 1+)
-- Applied via rusqlite on first open.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS screenshots (
    id          TEXT PRIMARY KEY,
    path        TEXT NOT NULL,
    hash        TEXT NOT NULL,
    width       INTEGER NOT NULL,
    height      INTEGER NOT NULL,
    byte_size   INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    metadata    TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_screenshots_created_at
    ON screenshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_hash
    ON screenshots(hash);

CREATE TABLE IF NOT EXISTS ocr_results (
    id           TEXT PRIMARY KEY,
    screenshot   TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    language     TEXT NOT NULL,
    confidence   REAL NOT NULL,
    extracted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_screenshot
    ON ocr_results(screenshot);

CREATE VIRTUAL TABLE IF NOT EXISTS ocr_fts USING fts5(
    text,
    content='ocr_results',
    content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS recordings (
    id          TEXT PRIMARY KEY,
    path        TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    codec       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS uploads (
    id          TEXT PRIMARY KEY,
    provider    TEXT NOT NULL,
    url         TEXT NOT NULL,
    local_path  TEXT NOT NULL,
    expires_at  TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
