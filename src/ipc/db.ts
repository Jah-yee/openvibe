import type { NodeKind } from "@/canvas/nodeElement";
import { createQueue } from "@/lib/queue";
import { call } from "./invoke";

export interface Workspace {
  id: string;
  name: string;
  position: number;
}

/** An Excalidraw image, stored as its data URL. */
export interface StoredFile {
  id: string;
  mimeType: string;
  dataUrl: string;
  created: number;
}

export interface StoredNode {
  id: string;
  kind: NodeKind;
  payloadJson: string;
}

export interface WorkspaceData {
  elementsJson: string | null;
  appStateJson: string | null;
  files: StoredFile[];
  nodes: StoredNode[];
}

// Writes go through one queue: a scene save that purges nodes must never overtake
// the save of a node created just before it.
const write = createQueue();

export const listWorkspaces = () => call<Workspace[]>("list_workspaces");
export const loadWorkspace = (id: string) => call<WorkspaceData>("load_workspace", { id });
export const getSetting = <T>(key: string) => call<T | null>("get_setting", { key });

export const createWorkspace = (name: string) => write(() => call<Workspace>("create_workspace", { name }));
export const renameWorkspace = (id: string, name: string) =>
  write(() => call<void>("rename_workspace", { id, name }));
export const deleteWorkspace = (id: string) => write(() => call<void>("delete_workspace", { id }));
export const saveScene = (workspaceId: string, elementsJson: string, appStateJson: string, nodeIds: string[]) =>
  write(() => call<void>("save_scene", { workspaceId, elementsJson, appStateJson, nodeIds }));
export const saveFiles = (workspaceId: string, files: StoredFile[]) =>
  write(() => call<void>("save_files", { workspaceId, files }));
export const saveNode = (id: string, workspaceId: string, kind: NodeKind, payloadJson: string) =>
  write(() => call<void>("save_node", { id, workspaceId, kind, payloadJson }));
export const setSetting = (key: string, value: unknown) => write(() => call<void>("set_setting", { key, value }));
