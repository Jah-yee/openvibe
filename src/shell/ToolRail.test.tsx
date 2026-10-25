// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { canvasStore } from "@/canvas/canvasStore";
import { launchFour, newConsole } from "@/fleet/quickActions";
import { ToolRail } from "./ToolRail";

// Excalidraw does not load under Vitest (roughjs); the rail drives it through the store's api only.
vi.mock("@excalidraw/excalidraw", () => ({}));
vi.mock("@/fleet/quickActions", () => ({ newConsole: vi.fn(), launchFour: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const setActiveTool = vi.fn();

beforeEach(async () => {
  mockIPC((cmd) => (cmd.startsWith("list_") ? [] : undefined));
  setActiveTool.mockClear();
  canvasStore.setState({ api: { setActiveTool } as unknown as ExcalidrawImperativeAPI });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<ToolRail />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  clearMocks();
});

const byLabel = (label: string) => host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

it("offers the canvas tools in the spec's order, each setting its Excalidraw tool (spec identité §5.4)", async () => {
  const labels = [...host.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
  expect(labels).toEqual(["Sélection (V)", "Main (H)", "Formes", "Texte (T)", "Stylo (P)", "Gomme (E)", "Image", "Lancer un agent", "Ajuster la vue"]);
  const tools: [string, string][] = [
    ["Sélection (V)", "selection"],
    ["Main (H)", "hand"],
    ["Texte (T)", "text"],
    ["Gomme (E)", "eraser"],
    ["Image", "image"],
  ];
  for (const [label, type] of tools) {
    await act(async () => byLabel(label).click());
    expect(setActiveTool).toHaveBeenLastCalledWith({ type });
  }
});

it("holds the catalog, Nouvelle console, Lancer 4 agents and Orchestrateur in its ＋ (spec identité §5.4, §11)", async () => {
  const menuEntries = () =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-slot="popover-content"] button')].map((b) => b.textContent ?? "");
  await act(async () => byLabel("Lancer un agent").click());
  const entries = menuEntries();
  expect(entries[0]).toContain("Claude");
  expect(entries.slice(-4, -1)).toEqual(["Nouvelle console", "Lancer 4 agents", expect.stringContaining("Orchestrateur")]);
  const click = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('[data-slot="popover-content"] button')].find((b) => b.textContent === text)!.click();
  await act(async () => click("Nouvelle console"));
  expect(newConsole).toHaveBeenCalledTimes(1);
  await act(async () => byLabel("Lancer un agent").click());
  await act(async () => click("Lancer 4 agents"));
  expect(launchFour).toHaveBeenCalledTimes(1);
});
