import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import { canvasStore } from "@/canvas/canvasStore";
import { isGroup } from "@/canvas/groups";
import { createNodeElement } from "@/canvas/nodeElement";
import { allowRemoval } from "@/canvas/removalGuard";
import { orchestratorSession } from "@/nodes/terminal/launch";
import { markForAutostart } from "@/nodes/terminal/registry";
import { ORCHESTRATOR_NAME } from "@/nodes/types";
import { nodesStore } from "@/store/nodes";
import { workspacesStore } from "@/store/workspaces";
import { orchestratorSpot } from "./groupLayout";
import { defaultLaunchOptions } from "./launchAgent";
import type { Point } from "./terminals";
import { withWire } from "./wires";

/** A new orchestrator with its Claude session, which starts when it is shown (spec orchestrateur §6). */
async function createOrchestrator(id: string, workspaceId: string) {
  const session = orchestratorSession(ORCHESTRATOR_NAME, defaultLaunchOptions());
  await nodesStore.getState().create(id, { workspaceId, kind: "orchestrator", payload: { name: ORCHESTRATOR_NAME, session } });
  markForAutostart(id);
}

/** "Relier un orchestrateur" of the group menu: a new orchestrator left of the group, wired to it, in one undo step. */
export async function orchestrateGroup(groupId: string) {
  const api = canvasStore.getState().api;
  const workspaceId = workspacesStore.getState().activeId;
  const group = canvasStore.getState().frames.find((f) => f.id === groupId);
  if (!api || !workspaceId || !group || !isGroup(group)) return;
  const element = createNodeElement("orchestrator", orchestratorSpot(group));
  await createOrchestrator(element.id, workspaceId);
  api.updateScene({
    elements: withWire([...api.getSceneElementsIncludingDeleted(), element], element.id, groupId),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** The menu's "Orchestrateur", placed with a click like an agent (spec habillage §10.1). */
export async function addOrchestrator(workspaceId: string, center: Point) {
  const api = canvasStore.getState().api;
  if (!api) return;
  const element = createNodeElement("orchestrator", center);
  await createOrchestrator(element.id, workspaceId);
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), element],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** One click of "Relier" (spec habillage §13). */
export function linkOrchestrator(orchestratorId: string, targetId: string) {
  const api = canvasStore.getState().api;
  if (!api) return;
  api.updateScene({
    elements: withWire(api.getSceneElementsIncludingDeleted(), orchestratorId, targetId),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** The × of an orchestrator: it and its wires go, in one undo step. */
export function removeOrchestrator(orchestratorId: string) {
  const api = canvasStore.getState().api;
  if (!api) return;
  allowRemoval([orchestratorId]);
  const wired = (e: { type: string; startBinding?: { elementId: string } | null; endBinding?: { elementId: string } | null }) =>
    e.type === "arrow" && (e.startBinding?.elementId === orchestratorId || e.endBinding?.elementId === orchestratorId);
  api.updateScene({
    elements: api
      .getSceneElementsIncludingDeleted()
      .map((e) => (!e.isDeleted && (e.id === orchestratorId || wired(e)) ? newElementWith(e, { isDeleted: true }) : e)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

export function renameOrchestrator(orchestratorId: string, name: string) {
  nodesStore.getState().update(orchestratorId, { name: name.trim() || ORCHESTRATOR_NAME });
}
