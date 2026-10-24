import { createStore, useStore } from "zustand";
import {
  createWorkspace,
  deleteWorkspace,
  getSetting,
  listWorkspaces,
  renameWorkspace,
  setSetting,
  setWorkspacePantheon,
  type Workspace,
} from "@/ipc/db";

export type { Workspace };

/** Plan 2 kept a single active workspace; it seeds the first project opened. */
const LEGACY_ACTIVE_KEY = "ui.activeWorkspaceId";
const activeKey = (projectId: string) => `ui.activeWorkspaceId.${projectId}`;

export interface WorkspacesState {
  projectId: string | null;
  workspaces: Workspace[];
  activeId: string | null;
  status: "loading" | "ready" | "error";
  error?: string;
  /** Loads the workspaces of a project, creating one if it has none. */
  load: (projectId: string) => Promise<void>;
  create: () => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  /** Deletes a workspace (never the last one) and selects its neighbor if it was active. */
  remove: (id: string) => Promise<void>;
  select: (id: string) => void;
  setPantheon: (id: string, pantheon: string) => Promise<void>;
}

/** "Workspace N" with the smallest N not already taken. */
export function nextDefaultName(workspaces: Workspace[]): string {
  const taken = new Set(workspaces.map((w) => w.name));
  let n = 1;
  while (taken.has(`Workspace ${n}`)) n++;
  return `Workspace ${n}`;
}

export function createWorkspacesStore() {
  return createStore<WorkspacesState>()((set, get) => {
    const rememberActive = (id: string) => {
      const projectId = get().projectId;
      if (!projectId) return;
      setSetting(activeKey(projectId), id).catch((error: unknown) => console.warn("active workspace not saved", error));
    };

    return {
      projectId: null,
      workspaces: [],
      activeId: null,
      status: "loading",

      load: async (projectId) => {
        set({ projectId, workspaces: [], activeId: null, status: "loading", error: undefined });
        try {
          let workspaces = await listWorkspaces(projectId);
          if (workspaces.length === 0) workspaces = [await createWorkspace(projectId, nextDefaultName([]))];
          const saved = (await getSetting<string>(activeKey(projectId))) ?? (await getSetting<string>(LEGACY_ACTIVE_KEY));
          const activeId = workspaces.some((w) => w.id === saved) ? saved! : workspaces[0].id;
          if (get().projectId === projectId) set({ workspaces, activeId, status: "ready" });
        } catch (error) {
          set({ status: "error", error: String(error) });
        }
      },

      create: async () => {
        const projectId = get().projectId;
        if (!projectId) return;
        const workspace = await createWorkspace(projectId, nextDefaultName(get().workspaces));
        set((s) => ({ workspaces: [...s.workspaces, workspace], activeId: workspace.id }));
        rememberActive(workspace.id);
      },

      rename: async (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        await renameWorkspace(id, trimmed);
        set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name: trimmed } : w)) }));
      },

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

      setPantheon: async (id, pantheon) => {
        await setWorkspacePantheon(id, pantheon);
        set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, pantheon } : w)) }));
      },
    };
  });
}

export const workspacesStore = createWorkspacesStore();

export function useWorkspaces<T>(selector: (state: WorkspacesState) => T): T {
  return useStore(workspacesStore, selector);
}
