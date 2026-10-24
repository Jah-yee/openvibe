pub mod scrollback;
pub mod session;
pub mod shell;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub use portable_pty::PtySize;

use crate::error::{AppError, AppResult};
use session::{OutputSink, Session, Started};
use shell::SpawnPlan;

/// Reported once a terminal's process has exited and its output is drained.
pub struct ExitInfo {
    pub code: Option<u32>,
    pub scrollback: Vec<u8>,
}

/// Owns every running terminal, keyed by canvas node id.
#[derive(Default)]
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, Arc<Session>>>>,
}

pub fn pty_size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        rows: rows.max(1),
        cols: cols.max(1),
        pixel_width: 0,
        pixel_height: 0,
    }
}

impl PtyManager {
    pub fn spawn(
        &self,
        node_id: &str,
        plan: SpawnPlan,
        size: PtySize,
        sink: Box<dyn OutputSink>,
        on_exit: impl FnOnce(ExitInfo) + Send + 'static,
    ) -> AppResult<Option<u32>> {
        let mut sessions = self.sessions.lock().unwrap();
        if sessions.contains_key(node_id) {
            return Err(AppError::InvalidInput(format!(
                "le terminal {node_id} tourne déjà"
            )));
        }
        let Started {
            session,
            mut child,
            reader,
        } = Session::start(plan, size, sink)?;
        sessions.insert(node_id.to_string(), session.clone());
        drop(sessions);

        let pid = session.pid;
        let sessions = self.sessions.clone();
        let node_id = node_id.to_string();
        std::thread::spawn(move || {
            let code = child.wait().ok().map(|status| status.exit_code());
            session.close();
            // Join so every byte reaches the sink before the exit is reported.
            let _ = reader.join();
            sessions.lock().unwrap().remove(&node_id);
            on_exit(ExitInfo {
                code,
                scrollback: session.scrollback(),
            });
        });
        Ok(pid)
    }

    /// Sends the current scrollback to `sink`, then streams new output to it.
    /// Returns false when no session is running for `node_id`.
    pub fn attach(&self, node_id: &str, sink: Box<dyn OutputSink>) -> bool {
        match self.get(node_id) {
            Some(session) => {
                session.attach(sink);
                true
            }
            None => false,
        }
    }

    pub fn write(&self, node_id: &str, data: &[u8]) -> AppResult<()> {
        self.require(node_id)?.write(data)
    }

    pub fn resize(&self, node_id: &str, size: PtySize) -> AppResult<()> {
        self.require(node_id)?.resize(size)
    }

    /// Idempotent: killing a terminal that already exited is not an error.
    pub fn kill(&self, node_id: &str) {
        if let Some(session) = self.get(node_id) {
            session.kill();
        }
    }

    pub fn kill_all(&self) {
        for session in self.sessions.lock().unwrap().values() {
            session.kill();
        }
    }

    pub fn list(&self) -> Vec<String> {
        self.sessions.lock().unwrap().keys().cloned().collect()
    }

    pub fn scrollback(&self, node_id: &str) -> Option<Vec<u8>> {
        self.get(node_id).map(|session| session.scrollback())
    }

    /// Scrollbacks that changed since the previous call (spec §5.6, every 10 s).
    pub fn dirty_scrollbacks(&self) -> Vec<(String, Vec<u8>)> {
        self.snapshot_sessions()
            .into_iter()
            .filter_map(|(id, session)| session.take_dirty_scrollback().map(|data| (id, data)))
            .collect()
    }

    /// Every live scrollback, for the final flush when the app exits.
    pub fn all_scrollbacks(&self) -> Vec<(String, Vec<u8>)> {
        self.snapshot_sessions()
            .into_iter()
            .map(|(id, session)| (id, session.scrollback()))
            .collect()
    }

    /// Copies the session list so no output lock is taken while holding the map lock.
    fn snapshot_sessions(&self) -> Vec<(String, Arc<Session>)> {
        let sessions = self.sessions.lock().unwrap();
        sessions
            .iter()
            .map(|(id, s)| (id.clone(), s.clone()))
            .collect()
    }

    fn get(&self, node_id: &str) -> Option<Arc<Session>> {
        self.sessions.lock().unwrap().get(node_id).cloned()
    }

    fn require(&self, node_id: &str) -> AppResult<Arc<Session>> {
        self.get(node_id)
            .ok_or_else(|| AppError::NotFound(format!("aucun terminal actif pour {node_id}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn size_is_clamped_to_one_cell_when_the_host_is_hidden() {
        // fit() reports 0x0 for a collapsed or not-yet-laid-out container.
        let size = pty_size(0, 0);
        assert_eq!((size.cols, size.rows), (1, 1));
    }
}

#[cfg(all(test, windows))]
mod windows_tests {
    use std::sync::mpsc;
    use std::time::{Duration, Instant};

    use super::*;

    #[derive(Clone, Default)]
    struct VecSink(Arc<Mutex<Vec<u8>>>);

    impl OutputSink for VecSink {
        fn send(&self, bytes: &[u8]) -> bool {
            self.0.lock().unwrap().extend_from_slice(bytes);
            true
        }
    }

    impl VecSink {
        fn text(&self) -> String {
            String::from_utf8_lossy(&self.0.lock().unwrap()).into_owned()
        }
    }

    fn cmd_plan(args: &[&str], initial_input: Option<&str>) -> SpawnPlan {
        SpawnPlan {
            program: "cmd.exe".into(),
            args: args.iter().map(|a| a.to_string()).collect(),
            cwd: std::env::temp_dir(),
            env: vec![],
            env_remove: vec![],
            initial_input: initial_input.map(str::to_string),
        }
    }

    fn wait_until(what: &str, mut cond: impl FnMut() -> bool) {
        let deadline = Instant::now() + Duration::from_secs(20);
        while !cond() {
            assert!(Instant::now() < deadline, "timed out waiting for {what}");
            std::thread::sleep(Duration::from_millis(50));
        }
    }

    /// ConPTY is created with PSEUDOCONSOLE_INHERIT_CURSOR, so it asks for the cursor
    /// position (`ESC[6n`) and blocks until it gets an answer. xterm.js answers in the
    /// app; tests have to play that role.
    fn spawn_answering(
        mgr: &PtyManager,
        id: &str,
        plan: SpawnPlan,
        sink: VecSink,
    ) -> mpsc::Receiver<ExitInfo> {
        let (tx, rx) = mpsc::channel();
        mgr.spawn(
            id,
            plan,
            pty_size(80, 24),
            Box::new(sink.clone()),
            move |info| {
                let _ = tx.send(info);
            },
        )
        .unwrap();
        wait_until("cursor position query", || sink.text().contains("\x1b[6n"));
        mgr.write(id, b"\x1b[1;1R").unwrap();
        rx
    }

    fn wait_exit(exited: &mpsc::Receiver<ExitInfo>) -> ExitInfo {
        exited
            .recv_timeout(Duration::from_secs(20))
            .expect("process should exit")
    }

    #[test]
    fn streams_output_and_reports_exit_code_with_the_final_scrollback() {
        let mgr = PtyManager::default();
        let sink = VecSink::default();
        let exited = spawn_answering(
            &mgr,
            "a",
            cmd_plan(&["/c", "echo openvibe-hello"], None),
            sink.clone(),
        );
        let info = wait_exit(&exited);
        assert_eq!(info.code, Some(0));
        assert!(
            sink.text().contains("openvibe-hello"),
            "output: {:?}",
            sink.text()
        );
        assert!(String::from_utf8_lossy(&info.scrollback).contains("openvibe-hello"));
        assert!(mgr.list().is_empty());
        assert!(mgr.scrollback("a").is_none());
    }

    #[test]
    fn types_initial_input_before_the_cursor_query_is_answered() {
        let mgr = PtyManager::default();
        let sink = VecSink::default();
        let exited = spawn_answering(
            &mgr,
            "b",
            cmd_plan(&[], Some("echo from-initial\r")),
            sink.clone(),
        );
        wait_until("initial input output", || {
            sink.text().contains("from-initial")
        });
        mgr.write("b", b"echo from-write\rexit\r").unwrap();
        wait_exit(&exited);
        assert!(
            sink.text().contains("from-write"),
            "output: {:?}",
            sink.text()
        );
    }

    #[test]
    fn runs_in_a_folder_with_spaces_and_accents() {
        let root = tempfile::tempdir().unwrap();
        let folder = root.path().join("Mes projets é");
        std::fs::create_dir(&folder).unwrap();
        let mut plan = cmd_plan(&["/c", "cd"], None);
        plan.cwd = folder.clone();
        let sink = VecSink::default();
        let exited = spawn_answering(&PtyManager::default(), "e", plan, sink.clone());
        assert_eq!(wait_exit(&exited).code, Some(0));
        assert!(
            sink.text().contains("Mes projets é"),
            "output: {:?}",
            sink.text()
        );
    }

    /// Keeps each chunk apart, to check what the first message on a sink is.
    #[derive(Clone, Default)]
    struct ChunkSink(Arc<Mutex<Vec<Vec<u8>>>>);

    impl OutputSink for ChunkSink {
        fn send(&self, bytes: &[u8]) -> bool {
            self.0.lock().unwrap().push(bytes.to_vec());
            true
        }
    }

    #[test]
    fn attach_sends_the_replay_as_the_first_message() {
        let mgr = PtyManager::default();
        let first = VecSink::default();
        let exited = spawn_answering(
            &mgr,
            "c",
            cmd_plan(&[], Some("echo before-attach\r")),
            first.clone(),
        );
        wait_until("first output", || first.text().contains("before-attach"));
        let second = ChunkSink::default();
        assert!(mgr.attach("c", Box::new(second.clone())));
        let replay = second.0.lock().unwrap()[0].clone();
        assert!(String::from_utf8_lossy(&replay).contains("before-attach"));
        mgr.kill("c");
        wait_exit(&exited);
        assert!(!mgr.attach("c", Box::new(VecSink::default())));
    }

    #[test]
    fn reports_each_changed_scrollback_once() {
        let mgr = PtyManager::default();
        let sink = VecSink::default();
        let exited = spawn_answering(
            &mgr,
            "f",
            cmd_plan(&[], Some("echo flushed\r")),
            sink.clone(),
        );
        wait_until("output", || sink.text().contains("flushed"));
        let dirty = mgr.dirty_scrollbacks();
        assert_eq!(dirty.len(), 1);
        assert_eq!(dirty[0].0, "f");
        assert!(String::from_utf8_lossy(&dirty[0].1).contains("flushed"));
        assert!(mgr.dirty_scrollbacks().is_empty());
        assert_eq!(mgr.all_scrollbacks().len(), 1);
        mgr.kill_all();
        wait_exit(&exited);
    }

    #[test]
    fn removes_inherited_variables_from_the_terminal() {
        // SAFETY: no other test reads or writes this variable.
        unsafe { std::env::set_var("OPENVIBE_TEST_MARKER", "leaked") };
        let mut plan = cmd_plan(&["/c", "echo [%OPENVIBE_TEST_MARKER%]"], None);
        plan.env_remove = vec!["OPENVIBE_TEST_MARKER".into()];
        let sink = VecSink::default();
        let exited = spawn_answering(&PtyManager::default(), "g", plan, sink.clone());
        wait_exit(&exited);
        assert!(
            sink.text().contains("[%OPENVIBE_TEST_MARKER%]"),
            "output: {:?}",
            sink.text()
        );
        assert!(!sink.text().contains("leaked"));
    }

    #[test]
    fn rejects_a_second_spawn_for_the_same_node_and_resizes() {
        let mgr = PtyManager::default();
        let exited = spawn_answering(&mgr, "d", cmd_plan(&[], None), VecSink::default());
        let again = mgr.spawn(
            "d",
            cmd_plan(&[], None),
            pty_size(80, 24),
            Box::new(VecSink::default()),
            |_| {},
        );
        assert_eq!(again.unwrap_err().kind(), "invalidInput");
        mgr.resize("d", pty_size(120, 40)).unwrap();
        assert_eq!(mgr.list(), vec!["d".to_string()]);
        mgr.kill_all();
        wait_exit(&exited);
    }

    #[test]
    fn unknown_terminals_are_not_found_and_kill_is_idempotent() {
        let mgr = PtyManager::default();
        assert_eq!(mgr.write("nope", b"x").unwrap_err().kind(), "notFound");
        assert_eq!(
            mgr.resize("nope", pty_size(80, 24)).unwrap_err().kind(),
            "notFound"
        );
        mgr.kill("nope");
    }
}
