import { getScrollback, ptyAttach, ptyKill, ptySpawn } from "@/ipc/pty";
import type { TerminalPayload } from "@/nodes/types";
import { isRunning, terminalStatusStore, waitForExit } from "@/store/terminalStatus";
import { buildSpawnSpec, type LaunchMode } from "./launch";

/** The part of an xterm `Terminal` the session logic needs (lets tests use a fake). */
export interface TermSink {
  write(data: string | Uint8Array, callback?: () => void): void;
  readonly cols: number;
  readonly rows: number;
}

/** Per-terminal flag: true while replayed output is being written (see attachSession). */
export interface SessionState {
  replaying: boolean;
  /** True while a keystroke restarts the terminal: that keystroke is not sent. */
  restarting?: boolean;
}

const setStatus = terminalStatusStore.getState().set;

/** Keystrokes go to the process only while it runs, no old output is replayed and no restart is under way. */
export function acceptsInput(nodeId: string, state: SessionState): boolean {
  return !state.replaying && !state.restarting && isRunning(nodeId);
}

export async function startSession(nodeId: string, term: TermSink, payload: TerminalPayload, mode: LaunchMode) {
  // "running" is set before spawning: ConPTY's cursor query arrives before the
  // spawn command returns, and xterm's answer must be let through.
  setStatus(nodeId, { state: "running" });
  try {
    await ptySpawn(nodeId, buildSpawnSpec(payload, mode), term.cols, term.rows, (bytes) => term.write(bytes));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(nodeId, { state: "error", message });
    term.write(`\r\n\x1b[31m${message}\x1b[0m\r\n`);
  }
}

/**
 * Reconnects to a process that kept running while the webview reloaded. Rust
 * always sends the replay first; it contains past terminal queries (cursor
 * position, device attributes…) that xterm would answer into the live process,
 * so input is ignored until the replay has been written.
 */
export async function attachSession(nodeId: string, term: TermSink, state: SessionState): Promise<boolean> {
  state.replaying = true;
  setStatus(nodeId, { state: "running" });
  let first = true;
  const attached = await ptyAttach(nodeId, (bytes) => {
    if (!first) return term.write(bytes);
    first = false;
    term.write(bytes, () => {
      state.replaying = false;
    });
  });
  if (!attached) {
    state.replaying = false;
    setStatus(nodeId, { state: "stopped" });
  }
  return attached;
}

/** Shows the last saved output of a stopped terminal (spec §6.5). */
export async function restoreSession(nodeId: string, term: TermSink) {
  setStatus(nodeId, { state: "stopped" });
  const bytes = await getScrollback(nodeId);
  if (bytes.length > 0) term.write(bytes);
}

/**
 * Stops the process if it runs, waits for its exit, then starts it again.
 * `beforeStart` runs in between: what follows is the new session's.
 */
export async function relaunchSession(nodeId: string, term: TermSink, payload: TerminalPayload, mode: LaunchMode, beforeStart?: () => void) {
  if (isRunning(nodeId)) {
    await ptyKill(nodeId);
    await waitForExit(nodeId);
  }
  beforeStart?.();
  term.write("\r\n\x1b[2m── relance ──\x1b[0m\r\n");
  await startSession(nodeId, term, payload, mode);
}
