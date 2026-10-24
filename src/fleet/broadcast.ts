import { toast } from "sonner";
import { createStore } from "zustand";
import { canvasStore } from "@/canvas/canvasStore";
import type { Activity } from "@/ipc/activity";
import { ptyInterrupt, ptySendText, type AgentId } from "@/ipc/pty";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore, terminalOf } from "@/store/nodes";
import { statusOf } from "@/store/terminalStatus";
import { AGENTS } from "./catalog";

/** "Tout reprendre" only restarts agents OpenVibe paused less than this ago (spec habillage §14). */
export const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * What "Reprendre" types (spec §14), on a line of its own: Claude Code puts a
 * prompt interrupted before any answer back in its input, and "continue" must
 * not be glued to it.
 */
const RESUME_TEXT = "\ncontinue";

interface PausedState {
  /** When OpenVibe paused each agent; kept in memory only. */
  pausedAt: Record<string, number>;
  mark: (ids: readonly string[], at: number) => void;
  clear: (ids: readonly string[]) => void;
}

export const pausedStore = createStore<PausedState>()((set) => ({
  pausedAt: {},
  mark: (ids, at) => set((s) => ({ pausedAt: { ...s.pausedAt, ...Object.fromEntries(ids.map((id) => [id, at])) } })),
  clear: (ids) => set((s) => ({ pausedAt: Object.fromEntries(Object.entries(s.pausedAt).filter(([id]) => !ids.includes(id))) })),
}));

/** What pause and resume look at. */
export interface AgentFacts {
  agent: AgentId;
  running: boolean;
  activity: Activity | undefined;
}

/** A running agent at work, other than a plain shell (spec §14). */
export function canPause(facts: AgentFacts): boolean {
  return facts.running && facts.agent !== "shell" && facts.activity === "working";
}

/** A running agent that is idle, other than a plain shell. */
export function canResume(facts: AgentFacts): boolean {
  return facts.running && facts.agent !== "shell" && (facts.activity ?? "idle") === "idle";
}

function factsOf(id: string): AgentFacts | null {
  const payload = terminalOf(nodesStore.getState().nodes[id]);
  if (!payload) return null;
  return {
    agent: payload.agent,
    running: statusOf(id).state === "running",
    activity: agentActivityStore.getState().activities[id]?.activity,
  };
}

function nameOf(id: string): string {
  const payload = terminalOf(nodesStore.getState().nodes[id]);
  return payload ? payload.name || AGENTS[payload.agent].label : "Agent";
}

/**
 * Types `text` into each running terminal of `ids` (spec §12). Stopped ones,
 * and those whose process dies meanwhile, are ignored and named (spec §17).
 */
export async function sendToAgents(ids: readonly string[], text: string): Promise<{ sent: number; skipped: string[] }> {
  const results = await Promise.all(
    ids.map(async (id) => {
      const facts = factsOf(id);
      if (!facts) return null;
      if (!facts.running) return nameOf(id);
      try {
        await ptySendText(id, text);
        return true;
      } catch {
        return nameOf(id);
      }
    }),
  );
  return {
    sent: results.filter((result) => result === true).length,
    skipped: results.filter((result): result is string => typeof result === "string"),
  };
}

/** Interrupts the agents of `ids` that are at work, and remembers them for "Tout reprendre". */
export async function pauseAgents(ids: readonly string[], now = Date.now()): Promise<number> {
  const targets = ids.filter((id) => {
    const facts = factsOf(id);
    return facts !== null && canPause(facts);
  });
  const paused = await Promise.all(targets.map((id) => ptyInterrupt(id).then((sent) => (sent ? id : null), () => null)));
  const done = paused.filter((id): id is string => id !== null);
  pausedStore.getState().mark(done, now);
  return done.length;
}

/** Sends "continue" to the idle agents of `ids` OpenVibe paused less than 24 h ago (spec §14). */
export async function resumeAgents(ids: readonly string[], now = Date.now()): Promise<number> {
  const { pausedAt } = pausedStore.getState();
  const targets = ids.filter((id) => {
    const facts = factsOf(id);
    const at = pausedAt[id];
    return facts !== null && canResume(facts) && at !== undefined && now - at < RESUME_WINDOW_MS;
  });
  const resumed = await Promise.all(targets.map((id) => ptySendText(id, RESUME_TEXT).then(() => id, () => null)));
  const done = resumed.filter((id): id is string => id !== null);
  pausedStore.getState().clear(done);
  return done.length;
}

/** "Reprendre" of one agent: an explicit request, so no 24 h limit. */
export async function resumeAgent(id: string): Promise<boolean> {
  const facts = factsOf(id);
  if (!facts || !canResume(facts)) return false;
  await ptySendText(id, RESUME_TEXT);
  pausedStore.getState().clear([id]);
  return true;
}

/** "2 agents arrêtés ignorés : Thot, Anubis" (spec §12). */
export function skippedText(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `1 agent arrêté ignoré : ${names[0]}`;
  return `${names.length} agents arrêtés ignorés : ${names.join(", ")}`;
}

export function pausedText(count: number): string {
  if (count === 0) return "Aucun agent en cours à mettre en pause";
  return count === 1 ? "1 agent mis en pause" : `${count} agents mis en pause`;
}

export function resumedText(count: number): string {
  if (count === 0) return "Aucun agent mis en pause à reprendre";
  return count === 1 ? "1 agent repris" : `${count} agents repris`;
}

/** The command bar's and the orchestrator's send, with the toast of ignored agents. */
export async function sendCommand(ids: readonly string[], text: string) {
  const { skipped } = await sendToAgents(ids, text);
  const warning = skippedText(skipped);
  if (warning) toast.warning(warning);
}

/** "Tout mettre en pause" of the chips, a group or an orchestrator. */
export async function pauseAll(ids: readonly string[]) {
  toast(pausedText(await pauseAgents(ids)));
}

/** "Tout reprendre" of the chips, a group or an orchestrator. */
export async function resumeAll(ids: readonly string[]) {
  toast(resumedText(await resumeAgents(ids)));
}

/** The terminals of the workspace on screen. */
export function workspaceTerminalIds(): string[] {
  const { nodes } = nodesStore.getState();
  return canvasStore.getState().nodeIds.filter((id) => nodes[id]?.kind === "terminal");
}
