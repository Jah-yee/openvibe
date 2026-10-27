//! OpenVibe's MCP server (spec orchestrateur §4.1): JSON-RPC over one HTTP
//! POST, answered at once. Rust holds the transport and the caller's identity;
//! `tools/list` and `tools/call` are answered by the interface.

use crate::sync::lock;
use crate::tr;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;

use serde_json::{Value, json};

/// Larger bodies are refused.
pub const MAX_BODY: usize = 256 * 1024;
/// The version answered when the client names none.
pub const PROTOCOL_VERSION: &str = "2025-06-18";

/// What the server does with one JSON-RPC message.
#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    /// Answered here.
    Reply(Value),
    /// A notification, or a response to nothing we asked: 202, no body.
    Accept,
    /// Answered by the interface, for the calling node.
    Forward {
        id: Value,
        method: String,
        params: Value,
    },
}

pub fn action(message: &Value) -> Action {
    let Some(id) = message.get("id").cloned() else {
        return Action::Accept;
    };
    let Some(method) = message["method"].as_str() else {
        return Action::Accept;
    };
    match method {
        "initialize" => {
            let version = message["params"]["protocolVersion"]
                .as_str()
                .unwrap_or(PROTOCOL_VERSION);
            Action::Reply(reply(
                &id,
                json!({
                    "protocolVersion": version,
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": "openvibe", "version": env!("CARGO_PKG_VERSION") },
                }),
            ))
        }
        "ping" => Action::Reply(reply(&id, json!({}))),
        "tools/list" | "tools/call" => Action::Forward {
            id,
            method: method.to_string(),
            params: message.get("params").cloned().unwrap_or_else(|| json!({})),
        },
        other => Action::Reply(failure(
            &id,
            -32601,
            &tr!("méthode inconnue : {other}", "unknown method: {other}"),
        )),
    }
}

pub fn reply(id: &Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

pub fn failure(id: &Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

/// The token of an `Authorization: Bearer <token>` header.
pub fn bearer(header: Option<&str>) -> Option<&str> {
    header?
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|token| !token.is_empty())
}

/// One token per Claude launch, naming its node; a relaunch revokes the old one.
#[derive(Default)]
pub struct Tokens(Mutex<HashMap<String, String>>);

impl Tokens {
    pub fn issue(&self, node_id: &str) -> String {
        let token = uuid::Uuid::new_v4().to_string();
        let mut tokens = lock(&self.0);
        tokens.retain(|_, node| node != node_id);
        tokens.insert(token.clone(), node_id.to_string());
        token
    }

    pub fn node(&self, token: &str) -> Option<String> {
        lock(&self.0).get(token).cloned()
    }

    pub fn revoke(&self, node_id: &str) {
        lock(&self.0).retain(|_, node| node != node_id);
    }
}

/// The calls waiting for the interface's answer.
#[derive(Default)]
pub struct Pending {
    next: AtomicU64,
    waiting: Mutex<HashMap<u64, mpsc::Sender<Value>>>,
}

impl Pending {
    pub fn open(&self) -> (u64, mpsc::Receiver<Value>) {
        let id = self.next.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = mpsc::channel();
        lock(&self.waiting).insert(id, tx);
        (id, rx)
    }

    /// False when nothing waits any more (answered too late).
    pub fn answer(&self, id: u64, value: Value) -> bool {
        match lock(&self.waiting).remove(&id) {
            Some(tx) => tx.send(value).is_ok(),
            None => false,
        }
    }

    pub fn close(&self, id: u64) {
        lock(&self.waiting).remove(&id);
    }
}
