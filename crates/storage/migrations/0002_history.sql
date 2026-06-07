-- M3 History: favorites + tags + metadata JSON support
ALTER TABLE screenshots ADD COLUMN favorited INTEGER NOT NULL DEFAULT 0;
ALTER TABLE screenshots ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_screenshots_favorited ON screenshots(favorited);

INSERT OR IGNORE INTO schema_migrations (version) VALUES (2);