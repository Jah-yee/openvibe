-- Schema v2 (spec habillage §15.1): projects, workspaces scoped to a project, and
-- the 'orchestrator' node kind. migrate_v2.rs runs this file, fills the new tables
-- and swaps them in, with foreign keys off (see db::migrate_up_to).
CREATE TABLE projects (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  path           TEXT NOT NULL UNIQUE,
  position       INTEGER NOT NULL,
  created_at     INTEGER NOT NULL,
  last_opened_at INTEGER NOT NULL
);

CREATE TABLE workspaces_new (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL,
  pantheon   TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE nodes_new (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('terminal', 'orchestrator', 'note', 'kanban', 'git')),
  payload_json TEXT NOT NULL,
  updated_at   INTEGER NOT NULL
);
