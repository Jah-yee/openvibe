use rusqlite::{Connection, OptionalExtension, params};

use super::now_ms;
use crate::error::AppResult;

/// Stores the latest scrollback of a terminal. Returns false (and stores nothing)
/// when the node row does not exist, e.g. a terminal deleted while it was running.
pub fn save(conn: &Connection, node_id: &str, data: &[u8]) -> AppResult<bool> {
    let stored = conn.execute(
        "INSERT INTO terminal_scrollback (node_id, data, updated_at)
         SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM nodes WHERE id = ?1)
         ON CONFLICT(node_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
        params![node_id, data, now_ms()],
    )?;
    Ok(stored > 0)
}

pub fn load(conn: &Connection, node_id: &str) -> AppResult<Option<Vec<u8>>> {
    Ok(conn
        .query_row(
            "SELECT data FROM terminal_scrollback WHERE node_id = ?1",
            [node_id],
            |row| row.get(0),
        )
        .optional()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::nodes::{self, NodeKind};
    use crate::db::{Db, workspaces};

    #[test]
    fn saves_and_replaces_the_scrollback_of_a_known_node() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let w = workspaces::create(conn, "A")?;
                nodes::save(conn, "t1", &w.id, NodeKind::Terminal, "{}")?;
                assert!(save(conn, "t1", b"first")?);
                assert!(save(conn, "t1", b"second\x1b[0m")?);
                assert_eq!(load(conn, "t1")?, Some(b"second\x1b[0m".to_vec()));
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn ignores_the_scrollback_of_an_unknown_node() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                assert!(!save(conn, "ghost", b"data")?);
                assert_eq!(load(conn, "ghost")?, None);
                Ok(())
            })
            .unwrap();
    }
}
