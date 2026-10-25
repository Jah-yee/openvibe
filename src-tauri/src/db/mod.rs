mod migrate_v2;
pub mod nodes;
pub mod projects;
pub mod scenes;
pub mod scrollback;
pub mod settings;
pub mod workspaces;

use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, Transaction};

use crate::error::AppResult;

/// One schema upgrade. Rust steps do what SQL alone cannot (read JSON payloads,
/// know the user's home folder).
enum Step {
    Sql(&'static str),
    Rust(fn(&Transaction, &str) -> rusqlite::Result<()>),
}

/// Each entry upgrades the schema by one version; `PRAGMA user_version` records how
/// many have run. Never edit a shipped entry: append a new one.
const MIGRATIONS: &[Step] = &[
    Step::Sql(include_str!("migrations/001_initial.sql")),
    Step::Rust(migrate_v2::run),
];

/// The single SQLite connection shared by every command (spec V1 §8.1).
pub struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        Self::init(Connection::open(path)?)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> AppResult<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(mut conn: Connection) -> AppResult<Self> {
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
        migrate(&mut conn, &home_dir())?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Runs `f` with exclusive access to the connection.
    pub fn with<T>(&self, f: impl FnOnce(&mut Connection) -> AppResult<T>) -> AppResult<T> {
        let mut conn = self.conn.lock().unwrap();
        f(&mut conn)
    }
}

/// The user's home folder: the project of workspaces that had no terminal (migration 002).
pub fn home_dir() -> String {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into())
}

fn migrate(conn: &mut Connection, home: &str) -> rusqlite::Result<()> {
    migrate_up_to(conn, MIGRATIONS.len(), home)
}

/// Applies the migrations not yet run, up to version `target`. Foreign keys are
/// off during a step: rebuilding a table drops it while others still reference it,
/// so the copied rows are checked before the step commits.
fn migrate_up_to(conn: &mut Connection, target: usize, home: &str) -> rusqlite::Result<()> {
    let applied: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    for index in (applied as usize)..target.min(MIGRATIONS.len()) {
        conn.execute_batch("PRAGMA foreign_keys = OFF")?;
        let result = apply(conn, index, home);
        conn.execute_batch("PRAGMA foreign_keys = ON")?;
        result?;
    }
    Ok(())
}

fn apply(conn: &mut Connection, index: usize, home: &str) -> rusqlite::Result<()> {
    let tx = conn.transaction()?;
    match &MIGRATIONS[index] {
        Step::Sql(sql) => tx.execute_batch(sql)?,
        Step::Rust(run) => run(&tx, home)?,
    }
    let orphans: i64 =
        tx.query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })?;
    if orphans > 0 {
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
            Some(format!(
                "migration {} : {orphans} ligne(s) orpheline(s)",
                index + 1
            )),
        ));
    }
    tx.pragma_update(None, "user_version", index as i64 + 1)?;
    tx.commit()
}

/// Unix time in milliseconds, the unit of every `*_at` column.
pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as i64)
}

/// Test-only: a workspace in a shared test project, for tests that do not care which.
#[cfg(test)]
pub fn test_workspace(conn: &Connection, name: &str) -> AppResult<workspaces::Workspace> {
    use rusqlite::OptionalExtension;
    const PATH: &str = "C:/openvibe-tests";
    let existing: Option<String> = conn
        .query_row("SELECT id FROM projects WHERE path = ?1", [PATH], |row| {
            row.get(0)
        })
        .optional()?;
    let project_id = match existing {
        Some(id) => id,
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO projects (id, name, path, position, created_at, last_opened_at)
                 VALUES (?1, 'tests', ?2, 0, 0, 0)",
                rusqlite::params![id, PATH],
            )?;
            id
        }
    };
    workspaces::create(conn, &project_id, name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_once_and_record_the_version() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            migrate(conn, "C:/Users/me")?;
            let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
            assert_eq!(version, MIGRATIONS.len() as i64);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn foreign_keys_are_back_on_after_migrating() {
        Db::open_in_memory()
            .unwrap()
            .with(|conn| {
                let on: i64 = conn.query_row("PRAGMA foreign_keys", [], |row| row.get(0))?;
                assert_eq!(on, 1);
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn reopening_a_database_file_keeps_its_data() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("openvibe.db");
        let created = Db::open(&path)
            .unwrap()
            .with(|conn| test_workspace(conn, "Persisté"))
            .unwrap();
        let names: Vec<String> = Db::open(&path)
            .unwrap()
            .with(|conn| workspaces::list(conn, &created.project_id))
            .unwrap()
            .into_iter()
            .map(|w| w.name)
            .collect();
        assert_eq!(names, vec!["Persisté".to_string()]);
    }
}
