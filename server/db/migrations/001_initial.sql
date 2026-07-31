-- Pixelanea schema v1
-- Managed by app_meta.schema_version

CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '1');

CREATE TABLE IF NOT EXISTS projects (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    width        INTEGER NOT NULL,
    height       INTEGER NOT NULL,
    frame_count  INTEGER NOT NULL DEFAULT 1,
    fps          REAL NOT NULL DEFAULT 8.0,
    cell_size    INTEGER NOT NULL DEFAULT 16,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS palettes (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS palette_colors (
    palette_id  TEXT NOT NULL REFERENCES palettes(id) ON DELETE CASCADE,
    slot        INTEGER NOT NULL,
    hex         TEXT NOT NULL,
    name        TEXT,
    sort_order  INTEGER NOT NULL,
    PRIMARY KEY (palette_id, slot)
);

CREATE TABLE IF NOT EXISTS frames (
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    frame_index  INTEGER NOT NULL,
    width        INTEGER NOT NULL,
    height       INTEGER NOT NULL,
    pixel_blob   BLOB NOT NULL,
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (project_id, frame_index)
);

CREATE TABLE IF NOT EXISTS assets (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mime       TEXT NOT NULL,
    filename   TEXT,
    data       BLOB NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_frames_project ON frames(project_id);
CREATE INDEX IF NOT EXISTS idx_palettes_project ON palettes(project_id);
