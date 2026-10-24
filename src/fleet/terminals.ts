import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import { canvasStore } from "@/canvas/canvasStore";
import { createNodeElement } from "@/canvas/nodeElement";
import { markForAutostart } from "@/nodes/terminal/registry";
import type { TerminalPayload } from "@/nodes/types";
import { nodesStore } from "@/store/nodes";
import { isRunning } from "@/store/terminalStatus";
import { uiStore } from "@/store/ui";
import { cloneTerminalPayload } from "./clone";
import { nameForNewAgent } from "./naming";

export interface Point {
  x: number;
  y: number;
}

/** Adds a terminal node centered on `center` (scene coordinates) and starts it when shown. */
export async function addTerminal(workspaceId: string, payload: TerminalPayload, center: Point): Promise<string | null> {
  const api = canvasStore.getState().api;
  if (!api) return null;
  const element = createNodeElement("terminal", center);
  // The node row must exist before the process can save its scrollback.
  await nodesStore.getState().create(element.id, { workspaceId, kind: "terminal", payload });
  markForAutostart(element.id);
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), element],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return element.id;
}

/** "Dupliquer" of the header: a copy of the agent to the right of the node. */
export async function duplicateTerminal(workspaceId: string, nodeId: string) {
  const element = canvasStore.getState().api?.getSceneElements().find((e) => e.id === nodeId);
  const source = nodesStore.getState().nodes[nodeId]?.payload;
  if (!element || !source) return;
  const center = { x: element.x + element.width * 1.5 + 24, y: element.y + element.height / 2 };
  await addTerminal(workspaceId, cloneTerminalPayload(source, await nameForNewAgent(workspaceId)), center);
}

/**
 * Gives terminal elements copied by Excalidraw (Ctrl+D, copy-paste) a node of
 * their own, then points their link at it. They start like any new agent.
 */
export async function adoptCopies(workspaceId: string, copies: readonly { id: string; sourceId: string }[]) {
  const api = canvasStore.getState().api;
  if (!api) return;
  for (const { id, sourceId } of copies) {
    const source = nodesStore.getState().nodes[sourceId]?.payload;
    if (!source) continue;
    markForAutostart(id);
    const name = await nameForNewAgent(workspaceId);
    await nodesStore.getState().create(id, { workspaceId, kind: "terminal", payload: cloneTerminalPayload(source, name) });
  }
  const ids = new Set(copies.map((copy) => copy.id));
  api.updateScene({
    elements: api
      .getSceneElementsIncludingDeleted()
      .map((e) => (ids.has(e.id) ? newElementWith(e, { link: `openvibe://terminal/${e.id}` }) : e)),
    captureUpdate: CaptureUpdateAction.NEVER,
  });
}

/** Deletes a node element; undo brings it back (spec V1 §8.5). */
export function removeNode(nodeId: string) {
  const api = canvasStore.getState().api;
  if (!api) return;
  api.updateScene({
    elements: api
      .getSceneElementsIncludingDeleted()
      .map((e) => (e.id === nodeId ? newElementWith(e, { isDeleted: true }) : e)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** "Fermer" of the header: a running agent asks for confirmation first (spec habillage §7.5). */
export function requestClose(nodeId: string) {
  if (isRunning(nodeId)) uiStore.getState().setClosing(nodeId);
  else removeNode(nodeId);
}
