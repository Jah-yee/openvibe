import { nodesStore } from "@/store/nodes";
import { workspacesStore } from "@/store/workspaces";
import { nextName } from "./names";

/** Names already carried by the terminals of a workspace. */
export function namesInWorkspace(workspaceId: string): string[] {
  return Object.values(nodesStore.getState().nodes)
    .filter((node) => node.workspaceId === workspaceId && node.kind === "terminal" && node.payload.name)
    .map((node) => node.payload.name);
}

/** The name of an agent about to be created outside any group (spec habillage §9.2). */
export async function nameForNewAgent(workspaceId: string): Promise<string> {
  const pantheon = await workspacesStore.getState().ensurePantheon(workspaceId);
  return nextName(pantheon, namesInWorkspace(workspaceId));
}

/** Names the terminals saved before names existed, in scene order. */
export async function assignMissingNames(workspaceId: string, orderedIds: readonly string[]): Promise<void> {
  const nodes = nodesStore.getState().nodes;
  const unnamed = orderedIds.filter((id) => nodes[id]?.kind === "terminal" && !nodes[id].payload.name);
  if (unnamed.length === 0) return;
  const pantheon = await workspacesStore.getState().ensurePantheon(workspaceId);
  const taken = namesInWorkspace(workspaceId);
  for (const id of unnamed) {
    const name = nextName(pantheon, taken);
    taken.push(name);
    nodesStore.getState().update(id, { name });
  }
}
