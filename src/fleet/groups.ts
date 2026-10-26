import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { canvasStore } from "@/canvas/canvasStore";
import { createGroupFrame, isGroup } from "@/canvas/groups";
import { allowRemoval } from "@/canvas/removalGuard";
import { createNodeElement } from "@/canvas/nodeElement";
import type { AgentId } from "@/ipc/pty";
import { newTerminalPayload } from "@/nodes/terminal/launch";
import { markForAutostart } from "@/nodes/terminal/registry";
import { nodesStore } from "@/store/nodes";
import { isRunning } from "@/store/terminalStatus";
import { uiStore } from "@/store/ui";
import { workspacesStore } from "@/store/workspaces";
import { clearSpot, groupGrid } from "./groupLayout";
import { defaultLaunchOptions, type LaunchOptions } from "./launchAgent";
import { nextName } from "./names";
import { nameForNewAgent, namesInWorkspace, pantheonForNewGroup } from "./naming";
import { viewportCenter } from "./placement";
import { ROLES, type RoleId } from "./roles";
import { addTerminal, type Point } from "./terminals";

export interface GroupPlan {
  name: string;
  role: RoleId;
  agents: AgentId[];
}

/** Time between two agents of a new group starting (spec habillage §20). */
export const LAUNCH_STAGGER_MS = 300;

/**
 * Creates a group around `at`, else the view's center — its frame and terminals in one
 * scene update, so one undo removes it — then shows it whole and starts its
 * agents one by one (spec habillage §11.3).
 */
export async function launchGroup(plan: GroupPlan, options: LaunchOptions = defaultLaunchOptions(), at?: Point) {
  const { api, view } = canvasStore.getState();
  const workspaceId = workspacesStore.getState().activeId;
  if (!api || !workspaceId || plan.agents.length === 0) return;
  const pantheon = pantheonForNewGroup(workspaceId);
  const grid = groupGrid(plan.agents.length);
  const center = at ?? viewportCenter(view);
  const obstacles = api.getSceneElements().map(({ x, y, width, height }) => ({ x, y, width, height }));
  const origin = clearSpot(
    { x: center.x - grid.width / 2, y: center.y - grid.height / 2, width: grid.width, height: grid.height },
    obstacles,
  );
  const name = plan.name.trim() || ROLES[plan.role].label;
  const frame = createGroupFrame({ ...origin, width: grid.width, height: grid.height }, name, { role: plan.role, pantheon });
  const taken = namesInWorkspace(workspaceId);
  const terminals: ExcalidrawElement[] = [];
  for (const [i, agent] of plan.agents.entries()) {
    const cell = grid.cells[i];
    const node = createNodeElement("terminal", { x: origin.x + cell.x + cell.width / 2, y: origin.y + cell.y + cell.height / 2 });
    const agentName = nextName(pantheon, taken);
    taken.push(agentName);
    await nodesStore.getState().create(node.id, {
      workspaceId,
      kind: "terminal",
      payload: newTerminalPayload({ ...options, agent }, agentName),
    });
    markForAutostart(node.id, i * LAUNCH_STAGGER_MS);
    terminals.push({ ...node, frameId: frame.id });
  }
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...terminals, frame],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  api.scrollToContent(frame, { fitToViewport: true, viewportZoomFactor: 0.9, animate: true, duration: 300, maxZoom: 1 });
}

/** "Ajouter un agent" of the group menu: the group's first free cell (spec §11.4). */
export async function addAgentToGroup(groupId: string, agent: AgentId) {
  const workspaceId = workspacesStore.getState().activeId;
  const group = canvasStore.getState().frames.find((f) => f.id === groupId);
  if (!workspaceId || !group || !isGroup(group)) return;
  const name = await nameForNewAgent(workspaceId, group.group.pantheon);
  const center = { x: group.x + group.width / 2, y: group.y + group.height / 2 };
  await addTerminal(workspaceId, newTerminalPayload({ ...defaultLaunchOptions(), agent }, name), center, groupId);
}

/**
 * Renames a group as one undoable step (see `groupBeingRenamed` for why the
 * label's editor is used rather than Excalidraw's). An empty name is ignored.
 */
export function renameGroup(groupId: string, name: string) {
  const api = canvasStore.getState().api;
  const trimmed = name.trim();
  if (!api || !trimmed) return;
  api.updateScene({
    elements: api
      .getSceneElementsIncludingDeleted()
      .map((e) => (e.id === groupId && e.type === "frame" && e.name !== trimmed ? newElementWith(e, { name: trimmed }) : e)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** "Dégrouper": the frame goes, its terminals stay where they are (spec §11.4). */
export function ungroup(groupId: string) {
  const api = canvasStore.getState().api;
  if (!api) return;
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((e) => {
      if (e.id === groupId) return newElementWith(e, { isDeleted: true });
      if (e.frameId === groupId) return newElementWith(e, { frameId: null });
      return e;
    }),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** "Fermer le groupe", confirmed: the frame and its terminals go; one undo brings them back, stopped. */
export function closeGroup(groupId: string) {
  const api = canvasStore.getState().api;
  if (!api) return;
  const going = api.getSceneElementsIncludingDeleted().filter((e) => !e.isDeleted && (e.id === groupId || e.frameId === groupId));
  allowRemoval(going.map((e) => e.id));
  api.updateScene({
    elements: api
      .getSceneElementsIncludingDeleted()
      .map((e) => (!e.isDeleted && (e.id === groupId || e.frameId === groupId) ? newElementWith(e, { isDeleted: true }) : e)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** Asks first when agents of the group are still running (spec §11.4). */
export function requestCloseGroup(groupId: string) {
  const group = canvasStore.getState().frames.find((f) => f.id === groupId);
  if (group?.memberIds.some(isRunning)) uiStore.getState().setClosingGroup(groupId);
  else closeGroup(groupId);
}

/** The terminals of a group, for its menu's pause and resume. */
export function groupMembers(groupId: string): string[] {
  return canvasStore.getState().frames.find((f) => f.id === groupId)?.memberIds ?? [];
}
