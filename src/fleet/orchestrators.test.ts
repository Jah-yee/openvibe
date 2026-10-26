// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { canvasStore } from "@/canvas/canvasStore";
import { markForAutostart } from "@/nodes/terminal/registry";
import { nodesStore, sessionOf } from "@/store/nodes";
import { addOrchestrator } from "./orchestrators";
import { adoptCopies } from "./terminals";

vi.mock("@excalidraw/excalidraw", () => ({ CaptureUpdateAction: { IMMEDIATELY: "i", NEVER: "n" }, newElementWith: (e: object, patch: object) => ({ ...e, ...patch }) }));
vi.mock("@/nodes/terminal/registry", () => ({ markForAutostart: vi.fn() }));

let scene: { id: string; isDeleted?: boolean; link?: string; customData?: object; type?: string; frameId?: string | null }[] = [];
beforeEach(() => {
  mockIPC(() => undefined);
  scene = [];
  const api = {
    getSceneElementsIncludingDeleted: () => scene,
    getSceneElements: () => scene,
    updateScene: ({ elements }: { elements?: typeof scene }) => {
      if (elements) scene = elements;
    },
  };
  canvasStore.setState({ api: api as unknown as ExcalidrawImperativeAPI });
});

it("places an orchestrator with its Claude session, started when shown (spec orchestrateur §6)", async () => {
  await addOrchestrator("w1", { x: 0, y: 0 });
  const id = scene[0].id;
  expect(sessionOf(nodesStore.getState().nodes[id])).toMatchObject({ agent: "claude", role: "orchestrator", name: "Orchestrateur" });
  expect(markForAutostart).toHaveBeenCalledWith(id);
});

it("gives a copied orchestrator a session of its own, created when shown", async () => {
  const session = { title: "Chef", name: "Chef", agent: "claude" as const, cwd: "C:/code", shell: "default" as const, command: "", claudeSessionId: "s1", role: "orchestrator" as const };
  await nodesStore.getState().create("chef", { workspaceId: "w1", kind: "orchestrator", payload: { name: "Chef", session } });
  scene = [{ id: "copie", type: "embeddable", customData: { kind: "orchestrator" }, frameId: null }];
  await adoptCopies("w1", [{ id: "copie", sourceId: "chef" }]);
  expect(nodesStore.getState().nodes.copie.payload).toEqual({ name: "Chef" });
});
