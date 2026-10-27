use rusqlite::{Connection, OptionalExtension, params};

use crate::error::AppResult;

/// Stores the scrollback of a terminal captured at `captured_at`, unless a later
/// capture is already stored: the periodic saver's snapshot, taken before an
/// exit but written after it, must not replace the final screen. Returns false
/// when nothing was stored, also when the node row does not exist (a terminal
/// deleted while it was running).
pub fn save(conn: &Connection, node_id: &str, data: &[u8], captured_at: i64) -> AppResult<bool> {
    let stored = conn.execute(
        "INSERT INTO terminal_scrollback (node_id, data, updated_at)
         SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM nodes WHERE id = ?1)
         ON CONFLICT(node_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
         WHERE excluded.updated_at >= terminal_scrollback.updated_at",
        params![node_id, data, captured_at],
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
    use crate::db::{Db, test_workspace};

    #[test]
    fn saves_and_replaces_the_scrollback_of_a_known_node() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let w = test_workspace(conn, "A")?;
                nodes::save(conn, "t1", &w.id, NodeKind::Terminal, "{}")?;
                assert!(save(conn, "t1", b"first", 1)?);
                assert!(save(conn, "t1", b"second\x1b[0m", 2)?);
                assert_eq!(load(conn, "t1")?, Some(b"second\x1b[0m".to_vec()));
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn an_older_capture_never_replaces_a_newer_one() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let w = test_workspace(conn, "A")?;
                nodes::save(conn, "t1", &w.id, NodeKind::Terminal, "{}")?;
                assert!(save(conn, "t1", b"final", 200)?);
                // The periodic saver's snapshot, taken before the exit, written after it.
                assert!(!save(conn, "t1", b"older", 100)?);
                assert_eq!(load(conn, "t1")?, Some(b"final".to_vec()));
                assert!(save(conn, "t1", b"same time", 200)?);
                assert_eq!(load(conn, "t1")?, Some(b"same time".to_vec()));
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn ignores_the_scrollback_of_an_unknown_node() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                assert!(!save(conn, "ghost", b"data", 1)?);
                assert_eq!(load(conn, "ghost")?, None);
                Ok(())
            })
            .unwrap();
    }
}
