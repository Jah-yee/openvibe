use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

use super::now_ms;
use crate::error::AppResult;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeKind {
    Terminal,
    Note,
    Kanban,
    Git,
}

impl NodeKind {
    fn as_str(self) -> &'static str {
        match self {
            NodeKind::Terminal => "terminal",
            NodeKind::Note => "note",
            NodeKind::Kanban => "kanban",
            NodeKind::Git => "git",
        }
    }
}

/// Creates or replaces the content of a node (spec §8.3). The payload is opaque
/// JSON owned by the frontend.
pub fn save(
    conn: &Connection,
    id: &str,
    workspace_id: &str,
    kind: NodeKind,
    payload_json: &str,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO nodes (id, workspace_id, kind, payload_json, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at",
        params![id, workspace_id, kind.as_str(), payload_json, now_ms()],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Db, workspaces};

    #[test]
    fn upserts_the_payload() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let w = workspaces::create(conn, "A")?;
                save(conn, "n1", &w.id, NodeKind::Terminal, r#"{"title":"a"}"#)?;
                save(conn, "n1", &w.id, NodeKind::Terminal, r#"{"title":"b"}"#)?;
                let payload: String =
                    conn.query_row("SELECT payload_json FROM nodes WHERE id = 'n1'", [], |r| {
                        r.get(0)
                    })?;
                assert_eq!(payload, r#"{"title":"b"}"#);
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn refuses_a_node_of_an_unknown_workspace() {
        let err = Db::open_in_memory()
            .unwrap()
            .with(|conn| save(conn, "n1", "nope", NodeKind::Note, "{}"))
            .unwrap_err();
        assert_eq!(err.kind(), "db");
    }
}
