//! The local HTTP endpoint the agents' hooks post to (spec habillage §10.3).
//! Bound to 127.0.0.1 on a port the system picks; every request must carry the
//! token drawn at startup.

use std::io::Read;

use tiny_http::{Method, Request, Response, Server};

use super::activity::{
    Activity, HookSource, claude_activity, claude_session_ended, codex_activity,
};

/// Larger bodies are refused (spec §10.3).
pub const MAX_BODY: usize = 64 * 1024;

/// A hook event that changes a terminal's activity.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HookHit {
    pub node_id: String,
    pub source: HookSource,
    pub activity: Activity,
    /// Claude left (`SessionEnd`): its shell's output decides again.
    pub session_ended: bool,
}

pub struct HookServer {
    pub port: u16,
    pub token: String,
}

impl HookServer {
    /// The URL a terminal's hooks post to.
    pub fn url(&self, source: HookSource, node_id: &str) -> String {
        let kind = match source {
            HookSource::Claude => "claude",
            HookSource::Codex => "codex",
        };
        format!(
            "http://127.0.0.1:{}/hook/{kind}/{node_id}?t={}",
            self.port, self.token
        )
    }
}

/// Starts the server; `on_hit` runs on the server's thread for each event
/// that maps to an activity.
pub fn start(on_hit: impl Fn(HookHit) + Send + 'static) -> std::io::Result<HookServer> {
    let server =
        Server::http("127.0.0.1:0").map_err(|err| std::io::Error::other(err.to_string()))?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|addr| addr.port())
        .ok_or_else(|| std::io::Error::other("no TCP port for the hook server"))?;
    let token = uuid::Uuid::new_v4().to_string();
    let expected = token.clone();
    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let status = status_of(&mut request, &expected, &on_hit);
            let _ = request.respond(Response::empty(status));
        }
    });
    Ok(HookServer { port, token })
}

/// Node ids name files too: only the characters of our UUIDs pass.
pub fn valid_node_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// `/hook/<claude|codex>/<nodeId>?t=<token>`. The token is checked first (403),
/// so nothing about the routes is told to a caller without it; then 404.
pub fn parse_route(url: &str, token: &str) -> Result<(HookSource, String), u16> {
    let (path, query) = url.split_once('?').unwrap_or((url, ""));
    if !query
        .split('&')
        .any(|pair| pair.strip_prefix("t=") == Some(token))
    {
        return Err(403);
    }
    let parts: Vec<&str> = path.trim_start_matches('/').split('/').collect();
    match parts.as_slice() {
        ["hook", "claude", node_id] if valid_node_id(node_id) => {
            Ok((HookSource::Claude, node_id.to_string()))
        }
        ["hook", "codex", node_id] if valid_node_id(node_id) => {
            Ok((HookSource::Codex, node_id.to_string()))
        }
        _ => Err(404),
    }
}

fn status_of(request: &mut Request, token: &str, on_hit: &dyn Fn(HookHit)) -> u16 {
    let (source, node_id) = match parse_route(request.url(), token) {
        Ok(route) => route,
        Err(status) => return status,
    };
    if *request.method() != Method::Post {
        return 405;
    }
    let mut body = Vec::new();
    if request
        .as_reader()
        .take(MAX_BODY as u64 + 1)
        .read_to_end(&mut body)
        .is_err()
    {
        return 400;
    }
    if body.len() > MAX_BODY {
        return 413;
    }
    let Ok(json) = serde_json::from_slice::<serde_json::Value>(&body) else {
        return 400;
    };
    let (activity, session_ended) = match source {
        HookSource::Claude => {
            let event = json["hook_event_name"].as_str().unwrap_or_default();
            if claude_session_ended(event, json["reason"].as_str()) {
                (Some(Activity::Idle), true)
            } else {
                (
                    claude_activity(event, json["notification_type"].as_str()),
                    false,
                )
            }
        }
        HookSource::Codex => (
            codex_activity(json["type"].as_str().unwrap_or_default()),
            false,
        ),
    };
    if let Some(activity) = activity {
        on_hit(HookHit {
            node_id,
            source,
            activity,
            session_ended,
        });
    }
    204
}

#[cfg(test)]
mod tests {
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::sync::mpsc;
    use std::time::Duration;

    use super::*;

    const TOKEN: &str = "0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10";

    #[test]
    fn routes_a_hook_to_its_terminal() {
        assert_eq!(
            parse_route(&format!("/hook/claude/node-1?t={TOKEN}"), TOKEN),
            Ok((HookSource::Claude, "node-1".to_string()))
        );
        assert_eq!(
            parse_route(&format!("/hook/codex/abc_2?x=1&t={TOKEN}"), TOKEN),
            Ok((HookSource::Codex, "abc_2".to_string()))
        );
    }

    #[test]
    fn refuses_a_missing_or_wrong_token_before_anything_else() {
        assert_eq!(parse_route("/hook/claude/node-1", TOKEN), Err(403));
        assert_eq!(parse_route("/hook/claude/node-1?t=nope", TOKEN), Err(403));
        assert_eq!(parse_route("/nothing?t=nope", TOKEN), Err(403));
    }

    #[test]
    fn refuses_unknown_routes_and_doubtful_node_ids() {
        for path in [
            "/hook/gemini/n",
            "/hook/claude",
            "/hook/claude/a/b",
            "/hook/claude/..",
            "/hook/claude/%2e%2e",
            "/other/claude/n",
        ] {
            assert_eq!(
                parse_route(&format!("{path}?t={TOKEN}"), TOKEN),
                Err(404),
                "{path}"
            );
        }
        assert!(!valid_node_id("../x"));
        assert!(!valid_node_id(""));
        assert!(valid_node_id("0b9c4b5e-6f1a-4c39-9d2e-8f6c2d1a7e10"));
    }

    /// One raw HTTP/1.1 request; returns the status code.
    fn send(port: u16, method: &str, path: &str, body: &[u8]) -> u16 {
        let mut stream = TcpStream::connect(("127.0.0.1", port)).unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .unwrap();
        let head = format!(
            "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        );
        stream.write_all(head.as_bytes()).unwrap();
        let _ = stream.write_all(body);
        let mut response = String::new();
        let _ = stream.read_to_string(&mut response);
        response
            .split_whitespace()
            .nth(1)
            .unwrap_or("0")
            .parse()
            .unwrap()
    }

    #[test]
    fn answers_hooks_and_reports_their_activity() {
        let (tx, rx) = mpsc::channel();
        let server = start(move |hit| {
            let _ = tx.send(hit);
        })
        .unwrap();
        let claude = server.url(HookSource::Claude, "n1");
        let path = claude.trim_start_matches(&format!("http://127.0.0.1:{}", server.port));

        assert_eq!(
            send(
                server.port,
                "POST",
                path,
                br#"{"hook_event_name":"UserPromptSubmit"}"#
            ),
            204
        );
        assert_eq!(
            rx.recv_timeout(Duration::from_secs(5)).unwrap(),
            HookHit {
                node_id: "n1".into(),
                source: HookSource::Claude,
                activity: Activity::Working,
                session_ended: false,
            }
        );
        let waiting =
            br#"{"hook_event_name":"Notification","notification_type":"permission_prompt"}"#;
        assert_eq!(send(server.port, "POST", path, waiting), 204);
        assert_eq!(
            rx.recv_timeout(Duration::from_secs(5)).unwrap().activity,
            Activity::Waiting
        );
        let ended = br#"{"hook_event_name":"SessionEnd","reason":"prompt_input_exit"}"#;
        assert_eq!(send(server.port, "POST", path, ended), 204);
        assert!(
            rx.recv_timeout(Duration::from_secs(5))
                .unwrap()
                .session_ended
        );
        // `/clear` goes on in the same process: no hit, the next one is Codex's.
        let cleared = br#"{"hook_event_name":"SessionEnd","reason":"clear"}"#;
        assert_eq!(send(server.port, "POST", path, cleared), 204);

        let codex = server.url(HookSource::Codex, "n2");
        let codex_path = codex.trim_start_matches(&format!("http://127.0.0.1:{}", server.port));
        assert_eq!(
            send(
                server.port,
                "POST",
                codex_path,
                br#"{"type":"agent-turn-complete"}"#
            ),
            204
        );
        assert_eq!(
            rx.recv_timeout(Duration::from_secs(5)).unwrap(),
            HookHit {
                node_id: "n2".into(),
                source: HookSource::Codex,
                activity: Activity::Idle,
                session_ended: false,
            }
        );
    }

    #[test]
    fn rejects_bad_requests_without_reporting_anything() {
        let (tx, rx) = mpsc::channel();
        let server = start(move |hit| {
            let _ = tx.send(hit);
        })
        .unwrap();
        let path = format!("/hook/claude/n1?t={}", server.token);
        assert_eq!(
            send(server.port, "POST", "/hook/claude/n1?t=wrong", b"{}"),
            403
        );
        assert_eq!(send(server.port, "GET", &path, b""), 405);
        assert_eq!(
            send(
                server.port,
                "POST",
                &format!("/hook/claude/..?t={}", server.token),
                b"{}"
            ),
            404
        );
        assert_eq!(send(server.port, "POST", &path, b"not json"), 400);
        let huge = vec![b' '; MAX_BODY + 1];
        assert_eq!(send(server.port, "POST", &path, &huge), 413);
        // An event OpenVibe does not track is accepted and ignored.
        assert_eq!(
            send(
                server.port,
                "POST",
                &path,
                br#"{"hook_event_name":"SessionStart"}"#
            ),
            204
        );
        assert!(rx.recv_timeout(Duration::from_millis(300)).is_err());
    }
}
