-- Pixelanea schema v3: animation loop flag stored with the project

ALTER TABLE projects ADD COLUMN loop INTEGER NOT NULL DEFAULT 1;

UPDATE app_meta SET value = '3' WHERE key = 'schema_version';
