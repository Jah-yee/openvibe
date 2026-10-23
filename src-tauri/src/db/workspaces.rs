use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;

use super::now_ms;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub position: i64,
}

pub fn list(conn: &Connection) -> AppResult<Vec<Workspace>> {
    let mut stmt =
        conn.prepare("SELECT id, name, position FROM workspaces ORDER BY position, created_at")?;
    let rows = stmt.query_map([], |row| {
        Ok(Workspace {
            id: row.get(0)?,
            name: row.get(1)?,
            position: row.get(2)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn create(conn: &Connection, name: &str) -> AppResult<Workspace> {
    let name = valid_name(name)?;
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM workspaces",
        [],
        |row| row.get(0),
    )?;
    let workspace = Workspace {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        position,
    };
    let now = now_ms();
    conn.execute(
        "INSERT INTO workspaces (id, name, position, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
        params![workspace.id, workspace.name, workspace.position, now],
    )?;
    Ok(workspace)
}

pub fn rename(conn: &Connection, id: &str, name: &str) -> AppResult<()> {
    let name = valid_name(name)?;
    let changed = conn.execute(
        "UPDATE workspaces SET name = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, name, now_ms()],
    )?;
    if changed == 0 {
        return Err(not_found(id));
    }
    Ok(())
}

/// Deletes a workspace and, by cascade, its scene, files, nodes and scrollback.
/// The last workspace cannot be deleted: the app always shows one.
pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let exists = conn
        .query_row("SELECT 1 FROM workspaces WHERE id = ?1", [id], |_| Ok(()))
        .optional()?;
    if exists.is_none() {
        return Err(not_found(id));
    }
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))?;
    if count <= 1 {
        return Err(AppError::InvalidInput(
            "impossible de supprimer le dernier workspace".into(),
        ));
    }
    conn.execute("DELETE FROM workspaces WHERE id = ?1", [id])?;
    Ok(())
}

fn valid_name(name: &str) -> AppResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::InvalidInput(
            "le nom du workspace est vide".into(),
        ));
    }
    Ok(name.to_string())
}

fn not_found(id: &str) -> AppError {
    AppError::NotFound(format!("workspace introuvable : {id}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;

    fn names(conn: &Connection) -> Vec<String> {
        list(conn).unwrap().into_iter().map(|w| w.name).collect()
    }

    #[test]
    fn creates_workspaces_in_order_with_trimmed_names() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let first = create(conn, "  Front  ")?;
                let second = create(conn, "API")?;
                assert_eq!((first.position, second.position), (0, 1));
                assert_eq!(names(conn), vec!["Front", "API"]);
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn rejects_blank_names() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                assert_eq!(create(conn, "   ").unwrap_err().kind(), "invalidInput");
                let w = create(conn, "A")?;
                assert_eq!(rename(conn, &w.id, " ").unwrap_err().kind(), "invalidInput");
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn renames_and_reports_unknown_ids() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let w = create(conn, "A")?;
                rename(conn, &w.id, "B")?;
                assert_eq!(names(conn), vec!["B"]);
                assert_eq!(rename(conn, "nope", "C").unwrap_err().kind(), "notFound");
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn deletes_a_workspace_but_never_the_last_one() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let a = create(conn, "A")?;
                let b = create(conn, "B")?;
                delete(conn, &a.id)?;
                assert_eq!(names(conn), vec!["B"]);
                assert_eq!(delete(conn, &b.id).unwrap_err().kind(), "invalidInput");
                assert_eq!(delete(conn, "nope").unwrap_err().kind(), "notFound");
                Ok(())
            })
            .unwrap();
    }
}
