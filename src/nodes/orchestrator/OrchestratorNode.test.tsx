// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { requestUi } from "@/commands/uiRequests";
import { nodesStore } from "@/store/nodes";
import { OrchestratorNode } from "./OrchestratorNode";

vi.mock("@excalidraw/excalidraw", () => ({}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("opens its name editor on request (« Renommer » of its radial menu)", async () => {
  mockIPC(() => undefined);
  await nodesStore.getState().create("chef", { workspaceId: "w1", kind: "orchestrator", payload: { name: "chef de backend" } });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<OrchestratorNode nodeId="chef" />));
  expect(host.querySelector("header input")).toBeNull();
  await act(async () => requestUi({ kind: "renameOrchestrator", id: "chef" }));
  const field = host.querySelector<HTMLInputElement>("header input")!;
  expect(field.value).toBe("chef de backend");
  expect(document.activeElement).toBe(field);
  await act(async () => root.unmount());
  host.remove();
});
