import { createStore, useStore } from "zustand";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

export interface Workspace {
  id: string;
  name: string;
}

/** What a workspace remembers of its canvas. Persisted to SQLite in milestone 5. */
export interface SavedScene {
  elements: readonly ExcalidrawElement[];
  appState: Pick<AppState, "scrollX" | "scrollY" | "zoom">;
}

export interface WorkspacesState {
  workspaces: Workspace[];
  activeId: string;
  scenes: Record<string, SavedScene>;
  create: (name?: string) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  select: (id: string) => void;
  saveScene: (id: string, scene: SavedScene) => void;
}

export function createWorkspacesStore() {
  const first: Workspace = { id: crypto.randomUUID(), name: "Workspace 1" };
  return createStore<WorkspacesState>()((set, get) => ({
    workspaces: [first],
    activeId: first.id,
    scenes: {},

    create: (name) => {
      const workspace = { id: crypto.randomUUID(), name: name?.trim() || `Workspace ${get().workspaces.length + 1}` };
      set((s) => ({ workspaces: [...s.workspaces, workspace], activeId: workspace.id }));
      return workspace.id;
    },

    rename: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name: trimmed } : w)) }));
    },

    // There is always at least one workspace; removing the active one selects its
    // neighbor (the next one, or the previous one when it was last).
    remove: (id) => {
      const { workspaces, activeId, scenes } = get();
      const index = workspaces.findIndex((w) => w.id === id);
      if (index === -1 || workspaces.length === 1) return;
      const remaining = workspaces.filter((w) => w.id !== id);
      const nextActive = id === activeId ? remaining[Math.min(index, remaining.length - 1)].id : activeId;
      const { [id]: _removed, ...otherScenes } = scenes;
      set({ workspaces: remaining, activeId: nextActive, scenes: otherScenes });
    },

    select: (id) => {
      if (get().workspaces.some((w) => w.id === id)) set({ activeId: id });
    },

    saveScene: (id, scene) => set((s) => ({ scenes: { ...s.scenes, [id]: scene } })),
  }));
}

export const workspacesStore = createWorkspacesStore();

export function useWorkspaces<T>(selector: (state: WorkspacesState) => T): T {
  return useStore(workspacesStore, selector);
}
