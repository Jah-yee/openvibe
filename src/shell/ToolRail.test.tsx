// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { canvasStore } from "@/canvas/canvasStore";
import { ToolRail } from "./ToolRail";

// Excalidraw does not load under Vitest (roughjs); the rail drives it through the store's api only.
vi.mock("@excalidraw/excalidraw", () => ({}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => mockIPC(() => undefined));
afterEach(() => clearMocks());

it("offers the canvas tools in the spec's order, the hand included (spec identité §5.4)", async () => {
  const setActiveTool = vi.fn();
  canvasStore.setState({ api: { setActiveTool } as unknown as ExcalidrawImperativeAPI });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<ToolRail />));
  const labels = [...host.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
  expect(labels).toEqual(["Sélection (V)", "Main (H)", "Formes", "Texte (T)", "Stylo (P)", "Gomme (E)", "Image", "Lancer un agent", "Ajuster la vue"]);
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Main (H)"]')!.click());
  expect(setActiveTool).toHaveBeenCalledWith({ type: "hand" });
  await act(async () => root.unmount());
  host.remove();
});
