-- Schema v1 (spec §8.2). Icon tables arrive with the cloud icons milestone.
CREATE TABLE workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE scenes (
  workspace_id   TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  elements_json  TEXT NOT NULL,
  app_state_json TEXT NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE scene_files (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  file_id      TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  data_url     TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, file_id)
);

CREATE TABLE nodes (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('terminal', 'note', 'kanban', 'git')),
  payload_json TEXT NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX nodes_workspace ON nodes(workspace_id);

CREATE TABLE terminal_scrollback (
  node_id    TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  data       BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
