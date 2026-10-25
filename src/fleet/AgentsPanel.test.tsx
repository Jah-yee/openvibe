// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { canvasStore } from "@/canvas/canvasStore";
import { BOTTOM_BAR_HEIGHT, TOP_ROW_HEIGHT } from "@/shell/layout";
import { nodesStore } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { agentsPanelStore } from "./agentsPanelState";
import { AgentsPanel } from "./AgentsPanel";

// Excalidraw does not load under Vitest (roughjs); the panel only reaches it through menu actions.
vi.mock("@excalidraw/excalidraw", () => ({}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  mockIPC(() => undefined);
  agentsPanelStore.setState({ open: true, filter: "all" });
  await nodesStore.getState().create("ada", {
    workspaceId: "w1",
    kind: "terminal",
    payload: { title: "Ada", name: "Ada", agent: "claude", cwd: "C:/code", shell: "default", command: "" },
  });
  terminalStatusStore.getState().set("ada", { state: "stopped" });
  canvasStore.getState().setNodeIds(["ada"]);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<AgentsPanel />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  clearMocks();
});

const byLabel = (label: string) => host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);

it("floats under the tabs, down to the command bar at most, with the chips' actions (spec identité §5.6)", () => {
  const panel = host.firstElementChild as HTMLElement;
  expect(panel.style.top).toBe(`${TOP_ROW_HEIGHT + 14}px`);
  expect(panel.style.maxHeight).toBe(`calc(100% - ${TOP_ROW_HEIGHT + 14 + BOTTOM_BAR_HEIGHT + 14}px)`);
  for (const label of ["Lancer un agent", "Nouvelle console", "Composer un groupe", "Tout mettre en pause", "Tout reprendre", "Plus d'actions", "Fermer le panneau"]) {
    expect(byLabel(label), label).not.toBeNull();
  }
});

it("filters on the store's filter, labelled Prêts for idle agents", async () => {
  const filters = [...host.querySelectorAll<HTMLButtonElement>("[data-filter]")];
  expect(filters.map((f) => f.textContent?.replace(/\d+$/, ""))).toEqual(["Tous", "En cours", "Attend", "Prêts", "Arrêtés"]);
  await act(async () => filters[4].click());
  expect(agentsPanelStore.getState().filter).toBe("stopped");
  expect(filters[4].dataset.on).toBe("true");
});

it("folds a group and closes", async () => {
  expect(host.textContent).toContain("Ada");
  await act(async () => host.querySelector<HTMLButtonElement>("[data-section]")!.click());
  expect(host.textContent).not.toContain("Ada");
  await act(async () => byLabel("Fermer le panneau")!.click());
  expect(agentsPanelStore.getState().open).toBe(false);
});
