import { createStore, useStore } from "zustand";
import {
  createWorkspace,
  deleteWorkspace,
  getSetting,
  listWorkspaces,
  renameWorkspace,
  setSetting,
  type Workspace,
} from "@/ipc/db";

export type { Workspace };

const ACTIVE_KEY = "ui.activeWorkspaceId";

export interface WorkspacesState {
  workspaces: Workspace[];
  activeId: string | null;
  status: "loading" | "ready" | "error";
  error?: string;
  /** Loads the workspaces from SQLite, creating the first one on a fresh install. */
  init: () => Promise<void>;
  create: () => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  /** Deletes a workspace (never the last one) and selects its neighbor if it was active. */
  remove: (id: string) => Promise<void>;
  select: (id: string) => void;
}

/** "Workspace N" with the smallest N not already taken. */
export function nextDefaultName(workspaces: Workspace[]): string {
  const taken = new Set(workspaces.map((w) => w.name));
  let n = 1;
  while (taken.has(`Workspace ${n}`)) n++;
  return `Workspace ${n}`;
}

function rememberActive(id: string) {
  setSetting(ACTIVE_KEY, id).catch((error: unknown) => console.warn("active workspace not saved", error));
}

export function createWorkspacesStore() {
  return createStore<WorkspacesState>()((set, get) => ({
    workspaces: [],
    activeId: null,
    status: "loading",

    init: async () => {
      try {
        let workspaces = await listWorkspaces();
        if (workspaces.length === 0) workspaces = [await createWorkspace(nextDefaultName([]))];
        const saved = await getSetting<string>(ACTIVE_KEY);
        const activeId = workspaces.some((w) => w.id === saved) ? saved! : workspaces[0].id;
        set({ workspaces, activeId, status: "ready" });
      } catch (error) {
        set({ status: "error", error: String(error) });
      }
    },

    create: async () => {
      const workspace = await createWorkspace(nextDefaultName(get().workspaces));
      set((s) => ({ workspaces: [...s.workspaces, workspace], activeId: workspace.id }));
      rememberActive(workspace.id);
    },

    rename: async (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await renameWorkspace(id, trimmed);
      set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name: trimmed } : w)) }));
    },

    // There is always at least one workspace; removing the active one selects its
    // neighbor (the next one, or the previous one when it was last).
    remove: async (id) => {
      const { workspaces, activeId } = get();
      const index = workspaces.findIndex((w) => w.id === id);
      if (index === -1 || workspaces.length === 1) return;
      await deleteWorkspace(id);
      const remaining = workspaces.filter((w) => w.id !== id);
      const nextActive = id === activeId ? remaining[Math.min(index, remaining.length - 1)].id : activeId;
      set({ workspaces: remaining, activeId: nextActive });
      if (nextActive && nextActive !== activeId) rememberActive(nextActive);
    },

    select: (id) => {
      if (id === get().activeId || !get().workspaces.some((w) => w.id === id)) return;
      set({ activeId: id });
      rememberActive(id);
    },
  }));
}

export const workspacesStore = createWorkspacesStore();

export function useWorkspaces<T>(selector: (state: WorkspacesState) => T): T {
  return useStore(workspacesStore, selector);
}
