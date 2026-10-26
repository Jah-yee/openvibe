// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { pendingUiRequest } from "@/commands/uiRequests";
import { nodesStore } from "@/store/nodes";
import { uiStore } from "@/store/ui";
import { workspacesStore } from "@/store/workspaces";
import { openRadial, radialStore, updateRadial } from "./radialState";
import { RadialMenu } from "./RadialMenu";

vi.mock("@excalidraw/excalidraw", () => ({}));
vi.mock("@/nodes/terminal/registry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/nodes/terminal/registry")>()),
  terminalSelection: vi.fn(() => ""),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeAll(async () => {
  mockIPC(() => undefined);
  await nodesStore.getState().create("isis", {
    workspaceId: "w1",
    kind: "terminal",
    payload: { title: "Isis", name: "Isis", agent: "claude", cwd: "C:/code", shell: "default", command: "" },
  });
});
beforeEach(async () => {
  radialStore.setState({ ring: null });
  workspacesStore.setState({ activeId: "w1" } as never);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<RadialMenu />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

const open = () =>
  act(async () =>
    openRadial({
      kind: "terminal",
      client: { x: 300, y: 300 },
      center: { x: 300, y: 300 },
      context: { project: true, workspaceId: "w1", terminalCount: 1, terminalId: "isis", at: { x: 300, y: 300 } },
      pressed: false,
      sliding: false,
      hovered: null,
    }),
  );
const buttons = () => [...document.querySelectorAll<HTMLButtonElement>("[data-slot]")];

it("draws the ring around the click, clockwise from the top (spec menu radial §4.2, §5.1)", async () => {
  await open();
  expect(buttons().map((b) => b.getAttribute("aria-label"))).toEqual(["Copier", "Coller", "Renommer", "Relancer", "Fermer", "Dupliquer", "Mettre en pause", "Arrêter le processus"]);
  expect([buttons()[0].style.left, buttons()[0].style.top, buttons()[2].style.left, buttons()[2].style.top]).toEqual(["0px", "-84px", "84px", "0px"]);
  expect(document.querySelector<HTMLElement>("[data-radial]")!.style.left).toBe("300px");
});

it("greys what cannot run; its pill tells the name and why; a click on it does nothing", async () => {
  await open();
  const copy = buttons()[0];
  expect(copy.getAttribute("aria-disabled")).toBe("true");
  await act(async () => updateRadial({ hovered: 0 }));
  expect(document.querySelector("[data-radial]")!.textContent).toContain("Copier · aucune sélection");
  await act(async () => copy.click());
  expect(radialStore.getState().ring).not.toBeNull();
});

it("closes, then runs the chosen function on the next frame (« Renommer » opens the header's name editor)", async () => {
  await open();
  await act(async () => buttons()[2].click());
  expect(radialStore.getState().ring).toBeNull();
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  expect(pendingUiRequest()).toEqual({ kind: "renameTerminal", id: "isis" });
});

it("closes on its ×, and when the workspace changes or a dialog opens (spec menu radial §7)", async () => {
  await open();
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Fermer le menu"]')!.click());
  expect(radialStore.getState().ring).toBeNull();
  await open();
  await act(async () => workspacesStore.setState({ activeId: "w2" } as never));
  expect(radialStore.getState().ring).toBeNull();
  await open();
  await act(async () => uiStore.getState().setClosing({ agents: ["isis"], remove: ["isis"] }));
  expect(radialStore.getState().ring).toBeNull();
  uiStore.getState().setClosing(null);
});
