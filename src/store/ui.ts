import { createStore, useStore } from "zustand";
import type { AgentId } from "@/ipc/pty";
import type { LaunchOptions } from "@/fleet/launchAgent";

/** An agent chosen in the menu, waiting for a click on the canvas (spec habillage §10.1). */
export interface Placement {
  agent: AgentId;
  options: LaunchOptions;
}

interface UiState {
  placing: Placement | null;
  setPlacing: (placing: Placement | null) => void;
  /** The running terminal whose closing waits for confirmation. */
  closing: string | null;
  setClosing: (nodeId: string | null) => void;
}

export const uiStore = createStore<UiState>()((set) => ({
  placing: null,
  setPlacing: (placing) => set({ placing }),
  closing: null,
  setClosing: (closing) => set({ closing }),
}));

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector);
}
