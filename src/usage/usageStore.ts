import { createStore, useStore } from "zustand";
import { onClaudeStatus, type StatusEvent } from "@/ipc/usage";
import { mergeLimits, readStatus, type Limits, type SessionUsage } from "./usage";

interface UsageState {
  /** Each Claude session of this run of the app, by its session id. */
  sessions: Record<string, SessionUsage>;
  /** The plan's limits, as the latest status line gave them. */
  limits: Limits | null;
  apply: (event: StatusEvent, now: number) => void;
}

/** What the status lines of OpenVibe's Claude sessions report (spec maj §6); kept in memory. */
export const usageStore = createStore<UsageState>()((set) => ({
  sessions: {},
  limits: null,
  apply: (event, now) => {
    const { session, limits } = readStatus(event.status, event.nodeId, now);
    if (!session) return;
    set((s) => ({ sessions: { ...s.sessions, [session.sessionId]: session }, limits: limits ? mergeLimits(s.limits, limits) : s.limits }));
  },
}));

export function useUsage<T>(selector: (state: UsageState) => T): T {
  return useStore(usageStore, selector);
}

/** For the app's whole life: every status line updates the usage. */
export async function installUsage() {
  await onClaudeStatus((event) => usageStore.getState().apply(event, Date.now()));
}
