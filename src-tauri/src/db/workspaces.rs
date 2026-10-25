use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;

use super::now_ms;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub position: i64,
    /// Pantheon of the agents outside any group (spec habillage §9.2).
    pub pantheon: Option<String>,
}

pub fn list(conn: &Connection, project_id: &str) -> AppResult<Vec<Workspace>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, position, pantheon FROM workspaces
         WHERE project_id = ?1 ORDER BY position, created_at",
    )?;
    let rows = stmt.query_map([project_id], |row| {
        Ok(Workspace {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            position: row.get(3)?,
            pantheon: row.get(4)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn create(conn: &Connection, project_id: &str, name: &str) -> AppResult<Workspace> {
    let name = valid_name(name)?;
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM workspaces WHERE project_id = ?1",
        [project_id],
        |row| row.get(0),
    )?;
    let workspace = Workspace {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: project_id.to_string(),
        name,
        position,
        pantheon: None,
    };
    let now = now_ms();
    conn.execute(
        "INSERT INTO workspaces (id, project_id, name, position, pantheon, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?5)",
        params![
            workspace.id,
            workspace.project_id,
            workspace.name,
            workspace.position,
            now
        ],
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
/// The last workspace of a project cannot be deleted: a project always shows one.
pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let project_id: String = conn
        .query_row(
            "SELECT project_id FROM workspaces WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or_else(|| not_found(id))?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM workspaces WHERE project_id = ?1",
        [project_id],
        |row| row.get(0),
    )?;
    if count <= 1 {
        return Err(AppError::InvalidInput(
            "impossible de supprimer le dernier workspace du projet".into(),
        ));
    }
    conn.execute("DELETE FROM workspaces WHERE id = ?1", [id])?;
    Ok(())
}

pub fn set_pantheon(conn: &Connection, id: &str, pantheon: &str) -> AppResult<()> {
    let pantheon = pantheon.trim();
    if pantheon.is_empty() {
        return Err(AppError::InvalidInput("panthéon vide".into()));
    }
    let changed = conn.execute(
        "UPDATE workspaces SET pantheon = ?2 WHERE id = ?1",
        params![id, pantheon],
    )?;
    if changed == 0 {
        return Err(not_found(id));
    }
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

    fn project(conn: &Connection, path: &str) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO projects (id, name, path, position, created_at, last_opened_at) VALUES (?1, 'p', ?2, 0, 0, 0)",
            params![id, path],
        )
        .unwrap();
        id
    }

    fn names(conn: &Connection, project_id: &str) -> Vec<String> {
        list(conn, project_id)
            .unwrap()
            .into_iter()
            .map(|w| w.name)
            .collect()
    }

    #[test]
    fn creates_workspaces_in_order_within_their_project() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let p = project(conn, "C:/p");
                let q = project(conn, "C:/q");
                let first = create(conn, &p, "  Front  ")?;
                let other = create(conn, &q, "Ailleurs")?;
                let second = create(conn, &p, "API")?;
                assert_eq!((first.position, second.position, other.position), (0, 1, 0));
                assert_eq!(names(conn, &p), vec!["Front", "API"]);
                assert_eq!(first.project_id, p);
                assert_eq!(first.pantheon, None);
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn rejects_blank_names() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let p = project(conn, "C:/p");
                assert_eq!(create(conn, &p, "   ").unwrap_err().kind(), "invalidInput");
                let w = create(conn, &p, "A")?;
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
                let p = project(conn, "C:/p");
                let w = create(conn, &p, "A")?;
                rename(conn, &w.id, "B")?;
                assert_eq!(names(conn, &p), vec!["B"]);
                assert_eq!(rename(conn, "nope", "C").unwrap_err().kind(), "notFound");
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn deletes_a_workspace_but_never_the_last_of_its_project() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let p = project(conn, "C:/p");
                let q = project(conn, "C:/q");
                let a = create(conn, &p, "A")?;
                let b = create(conn, &p, "B")?;
                create(conn, &q, "Q")?;
                delete(conn, &a.id)?;
                assert_eq!(names(conn, &p), vec!["B"]);
                assert_eq!(delete(conn, &b.id).unwrap_err().kind(), "invalidInput");
                assert_eq!(delete(conn, "nope").unwrap_err().kind(), "notFound");
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn remembers_the_pantheon_of_ungrouped_agents() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let p = project(conn, "C:/p");
                let w = create(conn, &p, "A")?;
                set_pantheon(conn, &w.id, "egyptian")?;
                assert_eq!(list(conn, &p)?[0].pantheon.as_deref(), Some("egyptian"));
                assert_eq!(
                    set_pantheon(conn, &w.id, " ").unwrap_err().kind(),
                    "invalidInput"
                );
                assert_eq!(
                    set_pantheon(conn, "nope", "greek").unwrap_err().kind(),
                    "notFound"
                );
                Ok(())
            })
            .unwrap();
    }
}
