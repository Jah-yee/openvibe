import { createStore, useStore } from "zustand";
import type { NodeKind } from "@/canvas/nodeElement";
import { saveNode, type StoredNode } from "@/ipc/db";
import { debounce, type Debounced } from "@/lib/debounce";
import { onFlushAll } from "@/lib/flush";
import { rebasePath } from "@/lib/paths";
import { readTerminalPayload, type NodePayload } from "@/nodes/types";

export interface NodeRecord {
  workspaceId: string;
  kind: NodeKind;
  payload: NodePayload;
}

export interface NodesState {
  nodes: Record<string, NodeRecord>;
  /** Adds the nodes of a workspace loaded from SQLite, keeping newer in-memory copies. */
  hydrate: (workspaceId: string, stored: StoredNode[]) => void;
  /** Adds a node and saves it at once (its row must exist before its scrollback). */
  create: (id: string, record: NodeRecord) => Promise<void>;
  /** Changes a node; the save waits 500 ms for further changes. */
  update: (id: string, patch: Partial<NodePayload>) => void;
  /** Saves a node now, e.g. when an undo brings back a node purged from SQLite. */
  persist: (id: string) => Promise<void>;
  /** Drops the nodes of a deleted workspace and returns their ids. */
  forgetWorkspace: (workspaceId: string) => string[];
}

const SAVE_DELAY_MS = 500;

export function createNodesStore() {
  const pendingSaves = new Map<string, Debounced<[], Promise<void> | undefined>>();

  const store = createStore<NodesState>()((set, get) => {
    const write = (id: string) => {
      const record = get().nodes[id];
      if (!record) return undefined;
      return saveNode(id, record.workspaceId, record.kind, JSON.stringify(record.payload));
    };

    const saveLater = (id: string) => {
      let save = pendingSaves.get(id);
      if (!save) {
        save = debounce(() => write(id), SAVE_DELAY_MS);
        pendingSaves.set(id, save);
      }
      save();
    };

    const saveNow = async (id: string) => {
      pendingSaves.get(id)?.cancel();
      await write(id);
    };

    return {
      nodes: {},

      hydrate: (workspaceId, stored) => {
        const loaded: Record<string, NodeRecord> = {};
        for (const node of stored) {
          let payload: NodePayload | null = null;
          try {
            payload = readTerminalPayload(JSON.parse(node.payloadJson));
          } catch {
            payload = null;
          }
          if (payload) loaded[node.id] = { workspaceId, kind: node.kind, payload };
          else console.warn(`node ${node.id}: unreadable payload, skipped`);
        }
        set((s) => ({ nodes: { ...loaded, ...s.nodes } }));
      },

      create: async (id, record) => {
        set((s) => ({ nodes: { ...s.nodes, [id]: record } }));
        await saveNow(id);
      },

      update: (id, patch) => {
        const record = get().nodes[id];
        if (!record) return;
        set((s) => ({ nodes: { ...s.nodes, [id]: { ...record, payload: { ...record.payload, ...patch } } } }));
        saveLater(id);
      },

      persist: saveNow,

      forgetWorkspace: (workspaceId) => {
        const ids = Object.keys(get().nodes).filter((id) => get().nodes[id].workspaceId === workspaceId);
        for (const id of ids) {
          pendingSaves.get(id)?.cancel();
          pendingSaves.delete(id);
        }
        set((s) => ({ nodes: Object.fromEntries(Object.entries(s.nodes).filter(([id]) => !ids.includes(id))) }));
        return ids;
      },
    };
  });

  const flushPending = () => Promise.all([...pendingSaves.values()].map((save) => save.flush()));
  return { store, flushPending };
}

const nodes = createNodesStore();
onFlushAll(nodes.flushPending);

export const nodesStore = nodes.store;

export function useNodes<T>(selector: (state: NodesState) => T): T {
  return useStore(nodesStore, selector);
}

/** After "Changer de dossier": terminals in memory follow the project's new folder. */
export function rebaseTerminalFolders(from: string, to: string) {
  for (const [id, node] of Object.entries(nodesStore.getState().nodes)) {
    if (node.kind !== "terminal") continue;
    const cwd = rebasePath(node.payload.cwd, from, to);
    if (cwd) nodesStore.getState().update(id, { cwd });
  }
}
