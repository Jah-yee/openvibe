import { createStore, useStore } from "zustand";
import type { AgentId } from "@/ipc/pty";
import type { LaunchOptions } from "@/fleet/launchAgent";

/** An agent, or an orchestrator, chosen in the menu and waiting for a click on the canvas (spec habillage §10.1). */
export type Placement = { agent: AgentId; options: LaunchOptions } | { orchestrator: true };

interface UiState {
  placing: Placement | null;
  setPlacing: (placing: Placement | null) => void;
  /** The running terminal whose closing waits for confirmation. */
  closing: string | null;
  setClosing: (nodeId: string | null) => void;
  /** The group whose closing waits for confirmation (some of its agents run). */
  closingGroup: string | null;
  setClosingGroup: (groupId: string | null) => void;
  /** The group whose label shows its name editor. */
  renamingGroup: string | null;
  setRenamingGroup: (groupId: string | null) => void;
  /** The fleet panel of the right rail is open. */
  fleetOpen: boolean;
  setFleetOpen: (open: boolean) => void;
  /** The orchestrator in "Relier" mode: each click wires a group or a terminal to it. */
  linking: string | null;
  setLinking: (orchestratorId: string | null) => void;
}

export const uiStore = createStore<UiState>()((set) => ({
  placing: null,
  setPlacing: (placing) => set({ placing }),
  closing: null,
  setClosing: (closing) => set({ closing }),
  closingGroup: null,
  setClosingGroup: (closingGroup) => set({ closingGroup }),
  renamingGroup: null,
  setRenamingGroup: (renamingGroup) => set({ renamingGroup }),
  fleetOpen: false,
  setFleetOpen: (fleetOpen) => set({ fleetOpen }),
  linking: null,
  setLinking: (linking) => set({ linking }),
}));

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector);
}
