import { getDB } from './connection'

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_dir TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  cover_hash_1 TEXT, cover_hash_2 TEXT, cover_hash_3 TEXT, cover_hash_4 TEXT
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, path TEXT NOT NULL,
  filename TEXT NOT NULL, hash TEXT NOT NULL,
  size_bytes INTEGER, width INTEGER, height INTEGER,
  imported_at INTEGER NOT NULL,
  ai_status TEXT NOT NULL DEFAULT 'pending',
  ai_quality_score REAL, ai_aesthetic_score REAL,
  ai_caption TEXT, ai_prompt_guess TEXT, ai_embedding BLOB,
  ai_cluster_id INTEGER, ai_error TEXT, ai_analyzed_at INTEGER,
  user_status TEXT, user_score INTEGER, user_note TEXT, decided_at INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE (project_id, hash)
);

CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(project_id, user_status);
CREATE INDEX IF NOT EXISTS idx_images_score ON images(project_id, user_score);
CREATE INDEX IF NOT EXISTS idx_images_quality ON images(project_id, ai_quality_score);
CREATE INDEX IF NOT EXISTS idx_images_aesthetic ON images(project_id, ai_aesthetic_score);
CREATE INDEX IF NOT EXISTS idx_images_cluster ON images(project_id, ai_cluster_id);

CREATE TABLE IF NOT EXISTS image_tags (
  image_id TEXT NOT NULL, tag_category TEXT NOT NULL, tag_value TEXT NOT NULL,
  PRIMARY KEY (image_id, tag_category, tag_value),
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tags_value ON image_tags(tag_category, tag_value);
CREATE INDEX IF NOT EXISTS idx_tags_image ON image_tags(image_id);

CREATE TABLE IF NOT EXISTS clusters (
  project_id TEXT NOT NULL, id INTEGER NOT NULL,
  representative_image_id TEXT, size INTEGER NOT NULL DEFAULT 0, summary TEXT,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
`

export function runMigrations(): void {
  getDB().exec(SCHEMA_SQL)
}
