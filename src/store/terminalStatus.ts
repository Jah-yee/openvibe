import { createStore, useStore } from "zustand";

export type TerminalStatus =
  /** Created, waiting for its staggered start (groups start one agent every 300 ms). */
  | { state: "starting" }
  | { state: "running" }
  | { state: "stopped" }
  | { state: "exited"; code: number | null }
  | { state: "error"; message: string };

interface TerminalStatusState {
  statuses: Record<string, TerminalStatus>;
  set: (nodeId: string, status: TerminalStatus) => void;
  remove: (nodeId: string) => void;
}

const STOPPED: TerminalStatus = { state: "stopped" };

export const terminalStatusStore = createStore<TerminalStatusState>()((set) => ({
  statuses: {},
  set: (nodeId, status) => set((s) => ({ statuses: { ...s.statuses, [nodeId]: status } })),
  remove: (nodeId) =>
    set((s) => ({ statuses: Object.fromEntries(Object.entries(s.statuses).filter(([id]) => id !== nodeId)) })),
}));

export function statusOf(nodeId: string): TerminalStatus {
  return terminalStatusStore.getState().statuses[nodeId] ?? STOPPED;
}

export function isRunning(nodeId: string): boolean {
  return statusOf(nodeId).state === "running";
}

export function useTerminalStatus(nodeId: string): TerminalStatus {
  return useStore(terminalStatusStore, (s) => s.statuses[nodeId] ?? STOPPED);
}

/**
 * Resolves once the terminal is no longer running (its `pty-exit` arrived), or
 * after `timeoutMs` so a lost event cannot block a relaunch forever.
 */
export function waitForExit(nodeId: string, timeoutMs = 5000): Promise<void> {
  if (!isRunning(nodeId)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    const unsubscribe = terminalStatusStore.subscribe(() => {
      if (!isRunning(nodeId)) done();
    });
  });
}
