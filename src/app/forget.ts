import { forgetScene } from "@/canvas/sceneCache";
import { disposeTerminal } from "@/nodes/terminal/registry";
import { nodesStore } from "@/store/nodes";

/** Drops everything the front keeps about deleted workspaces (their rows are gone). */
export function forgetWorkspaces(ids: string[]) {
  for (const id of ids) {
    nodesStore.getState().forgetWorkspace(id).forEach(disposeTerminal);
    forgetScene(id);
  }
}
