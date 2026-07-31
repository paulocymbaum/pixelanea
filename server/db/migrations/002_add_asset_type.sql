-- Pixelanea schema v2: project asset type (character, prop, background, animation)

ALTER TABLE projects ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'character';

UPDATE app_meta SET value = '2' WHERE key = 'schema_version';
