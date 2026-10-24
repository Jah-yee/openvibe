#![allow(dead_code)] // Wired in task 5.

//! Agent activity (spec habillage §10.2): working, waiting for the user or
//! idle, from the agents' hooks first, else from their terminal's output.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Activity {
    Idle,
    Working,
    Waiting,
}

/// Without hooks, output in the last 1.5 s means the agent works.
pub const QUIET_AFTER: Duration = Duration::from_millis(1500);
/// A hooked agent left working this long without output lost its `Stop` hook.
pub const HOOK_SAFETY_NET: Duration = Duration::from_secs(30);

/// Claude's hooks report every transition, so they replace the output
/// heuristic; Codex only reports the end of a turn.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HookSource {
    Claude,
    Codex,
}

/// A terminal's new activity, and since when.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Change {
    pub node_id: String,
    pub activity: Activity,
    pub since: Instant,
}

struct Node {
    activity: Activity,
    since: Instant,
    last_output: Option<Instant>,
    hooked: bool,
}

/// The activity of every running terminal.
#[derive(Default)]
pub struct Tracker {
    nodes: HashMap<String, Node>,
}

impl Tracker {
    /// A process just started: idle until it shows otherwise.
    pub fn start(&mut self, node_id: &str, now: Instant) -> Change {
        self.nodes.insert(
            node_id.to_string(),
            Node {
                activity: Activity::Idle,
                since: now,
                last_output: None,
                hooked: false,
            },
        );
        change(node_id, Activity::Idle, now)
    }

    /// The terminal printed something. Returns a change only when the
    /// activity changes, not for every chunk read.
    pub fn output(&mut self, node_id: &str, now: Instant) -> Option<Change> {
        let node = self.nodes.get_mut(node_id)?;
        node.last_output = Some(now);
        if node.hooked {
            return None;
        }
        set(node_id, node, Activity::Working, now)
    }

    pub fn hook(
        &mut self,
        node_id: &str,
        source: HookSource,
        activity: Activity,
        now: Instant,
    ) -> Option<Change> {
        let node = self.nodes.get_mut(node_id)?;
        if source == HookSource::Claude {
            node.hooked = true;
        }
        set(node_id, node, activity, now)
    }

    /// Working terminals that went quiet become idle: after 1.5 s without
    /// hooks, after 30 s with them (safety net for a lost `Stop`).
    pub fn tick(&mut self, now: Instant) -> Vec<Change> {
        let mut changes = Vec::new();
        for (node_id, node) in &mut self.nodes {
            if node.activity != Activity::Working {
                continue;
            }
            let last = node.last_output.map_or(node.since, |at| at.max(node.since));
            let limit = if node.hooked {
                HOOK_SAFETY_NET
            } else {
                QUIET_AFTER
            };
            if now.saturating_duration_since(last) >= limit {
                node.activity = Activity::Idle;
                node.since = now;
                changes.push(change(node_id, Activity::Idle, now));
            }
        }
        changes
    }

    pub fn remove(&mut self, node_id: &str) {
        self.nodes.remove(node_id);
    }

    pub fn snapshot(&self) -> Vec<Change> {
        self.nodes
            .iter()
            .map(|(node_id, node)| change(node_id, node.activity, node.since))
            .collect()
    }
}

fn change(node_id: &str, activity: Activity, since: Instant) -> Change {
    Change {
        node_id: node_id.to_string(),
        activity,
        since,
    }
}

fn set(node_id: &str, node: &mut Node, activity: Activity, now: Instant) -> Option<Change> {
    if node.activity == activity {
        return None;
    }
    node.activity = activity;
    node.since = now;
    Some(change(node_id, activity, now))
}

/// Claude's hook events (spec §10.2), from `hook_event_name` and `notification_type`.
pub fn claude_activity(event: &str, notification_type: Option<&str>) -> Option<Activity> {
    match event {
        "UserPromptSubmit" | "PostToolUse" => Some(Activity::Working),
        "Stop" | "StopFailure" => Some(Activity::Idle),
        "Notification" => match notification_type? {
            "permission_prompt"
            | "elicitation_dialog"
            | "elicitation_url_dialog"
            | "agent_needs_input" => Some(Activity::Waiting),
            "idle_prompt" => Some(Activity::Idle),
            _ => None,
        },
        _ => None,
    }
}

/// The type of Codex's `notify` payload that ends a turn.
pub fn codex_activity(kind: &str) -> Option<Activity> {
    (kind == "agent-turn-complete").then_some(Activity::Idle)
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, Instant};

    use super::*;

    fn ms(n: u64) -> Duration {
        Duration::from_millis(n)
    }

    fn started(t0: Instant) -> Tracker {
        let mut tracker = Tracker::default();
        tracker.start("a", t0);
        tracker
    }

    #[test]
    fn output_makes_an_agent_without_hooks_work_then_quiet_makes_it_idle() {
        let t0 = Instant::now();
        let mut tracker = started(t0);
        let change = tracker.output("a", t0 + ms(10)).unwrap();
        assert_eq!(change.activity, Activity::Working);
        assert_eq!(tracker.output("a", t0 + ms(500)), None);
        assert!(tracker.tick(t0 + ms(1900)).is_empty());
        let idle = tracker.tick(t0 + ms(2000));
        assert_eq!(idle.len(), 1);
        assert_eq!(
            (idle[0].node_id.as_str(), idle[0].activity),
            ("a", Activity::Idle)
        );
    }

    #[test]
    fn claude_hooks_replace_the_output_heuristic() {
        let t0 = Instant::now();
        let mut tracker = started(t0);
        let working = tracker
            .hook("a", HookSource::Claude, Activity::Working, t0)
            .unwrap();
        assert_eq!(working.activity, Activity::Working);
        // Output no longer decides, and short silences keep it working.
        assert_eq!(tracker.output("a", t0 + ms(100)), None);
        assert!(tracker.tick(t0 + ms(5000)).is_empty());
        let waiting = tracker
            .hook("a", HookSource::Claude, Activity::Waiting, t0 + ms(6000))
            .unwrap();
        assert_eq!(waiting.activity, Activity::Waiting);
        assert!(tracker.tick(t0 + ms(60_000)).is_empty());
        let idle = tracker
            .hook("a", HookSource::Claude, Activity::Idle, t0 + ms(61_000))
            .unwrap();
        assert_eq!(idle.activity, Activity::Idle);
        assert_eq!(tracker.output("a", t0 + ms(61_100)), None);
    }

    #[test]
    fn a_lost_stop_hook_ends_in_idle_after_thirty_seconds_without_output() {
        let t0 = Instant::now();
        let mut tracker = started(t0);
        tracker.hook("a", HookSource::Claude, Activity::Working, t0);
        tracker.output("a", t0 + ms(20_000));
        assert!(tracker.tick(t0 + ms(49_000)).is_empty());
        let idle = tracker.tick(t0 + ms(50_000));
        assert_eq!(idle[0].activity, Activity::Idle);
    }

    #[test]
    fn codex_turn_end_sets_idle_without_disabling_the_output_heuristic() {
        let t0 = Instant::now();
        let mut tracker = started(t0);
        tracker.output("a", t0);
        let idle = tracker
            .hook("a", HookSource::Codex, Activity::Idle, t0 + ms(100))
            .unwrap();
        assert_eq!(idle.activity, Activity::Idle);
        assert_eq!(
            tracker.output("a", t0 + ms(200)).unwrap().activity,
            Activity::Working
        );
    }

    #[test]
    fn removed_or_unknown_terminals_are_ignored() {
        let t0 = Instant::now();
        let mut tracker = started(t0);
        tracker.remove("a");
        assert_eq!(tracker.output("a", t0), None);
        assert_eq!(
            tracker.hook("zzz", HookSource::Claude, Activity::Working, t0),
            None
        );
        assert!(tracker.snapshot().is_empty());
    }

    #[test]
    fn snapshot_lists_the_current_activity_of_each_terminal() {
        let t0 = Instant::now();
        let mut tracker = started(t0);
        tracker.start("b", t0);
        tracker.output("b", t0 + ms(5));
        let mut snapshot = tracker.snapshot();
        snapshot.sort_by(|x, y| x.node_id.cmp(&y.node_id));
        let pairs: Vec<_> = snapshot
            .iter()
            .map(|c| (c.node_id.as_str(), c.activity))
            .collect();
        assert_eq!(pairs, vec![("a", Activity::Idle), ("b", Activity::Working)]);
    }

    #[test]
    fn maps_claude_hook_events() {
        assert_eq!(
            claude_activity("UserPromptSubmit", None),
            Some(Activity::Working)
        );
        assert_eq!(
            claude_activity("PostToolUse", None),
            Some(Activity::Working)
        );
        assert_eq!(claude_activity("Stop", None), Some(Activity::Idle));
        assert_eq!(claude_activity("StopFailure", None), Some(Activity::Idle));
        for kind in [
            "permission_prompt",
            "elicitation_dialog",
            "elicitation_url_dialog",
            "agent_needs_input",
        ] {
            assert_eq!(
                claude_activity("Notification", Some(kind)),
                Some(Activity::Waiting)
            );
        }
        assert_eq!(
            claude_activity("Notification", Some("idle_prompt")),
            Some(Activity::Idle)
        );
        assert_eq!(claude_activity("Notification", Some("auth_success")), None);
        assert_eq!(claude_activity("Notification", None), None);
        assert_eq!(claude_activity("SessionStart", None), None);
    }

    #[test]
    fn maps_the_codex_turn_end() {
        assert_eq!(codex_activity("agent-turn-complete"), Some(Activity::Idle));
        assert_eq!(codex_activity("something-else"), None);
    }

    #[test]
    fn serializes_activities_for_the_frontend() {
        assert_eq!(
            serde_json::to_value(Activity::Waiting).unwrap(),
            serde_json::json!("waiting")
        );
    }
}
