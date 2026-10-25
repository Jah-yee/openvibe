import { createStore, useStore } from "zustand";
import { listAgents, listShells, type AgentInfo, type ShellKind } from "@/ipc/pty";

interface AgentsState {
  agents: AgentInfo[];
  shells: ShellKind[];
  /** Looks for the agents on the PATH again (an install shows up without restart). */
  load: () => Promise<void>;
}

export const agentsStore = createStore<AgentsState>()((set) => ({
  agents: [],
  shells: [],
  load: async () => {
    const [agents, shells] = await Promise.all([listAgents(), listShells()]);
    set({ agents, shells });
  },
}));

export function useAgents<T>(selector: (state: AgentsState) => T): T {
  return useStore(agentsStore, selector);
}
