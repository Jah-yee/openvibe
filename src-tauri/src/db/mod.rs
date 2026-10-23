pub mod settings;
pub mod workspaces;

use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;

use crate::error::AppResult;

/// Each entry upgrades the schema by one version; `PRAGMA user_version` records how
/// many have run. Never edit a shipped entry: append a new one.
const MIGRATIONS: &[&str] = &[include_str!("migrations/001_initial.sql")];

/// The single SQLite connection shared by every command (spec §8.1).
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

    fn init(conn: Connection) -> AppResult<Self> {
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
        migrate(&conn)?;
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

fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let applied: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(applied as usize) {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", index as i64 + 1)?;
        tx.commit()?;
    }
    Ok(())
}

/// Unix time in milliseconds, the unit of every `*_at` column.
pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_once_and_record_the_version() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            migrate(conn)?;
            let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
            assert_eq!(version, MIGRATIONS.len() as i64);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn reopening_a_database_file_keeps_its_data() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("openvibe.db");
        Db::open(&path)
            .unwrap()
            .with(|conn| workspaces::create(conn, "Persisté"))
            .unwrap();
        let names: Vec<String> = Db::open(&path)
            .unwrap()
            .with(|conn| workspaces::list(conn))
            .unwrap()
            .into_iter()
            .map(|w| w.name)
            .collect();
        assert_eq!(names, vec!["Persisté".to_string()]);
    }
}
