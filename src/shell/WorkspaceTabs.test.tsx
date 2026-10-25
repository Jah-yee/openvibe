// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { workspacesStore } from "@/store/workspaces";
import { TABS_HEIGHT } from "./layout";
import { WorkspaceTabs } from "./WorkspaceTabs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockIPC(() => undefined);
  workspacesStore.setState({
    workspaces: [
      { id: "w1", projectId: "p1", name: "Workspace 1", position: 0, pantheon: null },
      { id: "w2", projectId: "p1", name: "Backend", position: 1, pantheon: null },
    ],
    activeId: "w2",
  } as never);
});
afterEach(() => clearMocks());

it("shows the workspaces as browser tabs on a row that moves the window (spec identité §5.2)", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<WorkspaceTabs />));
  const row = host.firstElementChild as HTMLElement;
  expect(row.getAttribute("data-tauri-drag-region")).toBe("");
  expect(row.style.height).toBe(`${TABS_HEIGHT}px`);
  // The tabs sit 1 px low on the row's edge: they scroll sideways, never up and down.
  expect(row.className).toContain("overflow-y-hidden");
  const tabs = [...row.querySelectorAll<HTMLElement>("[data-tab]")];
  expect(tabs.map((t) => t.dataset.tab)).toEqual(["w1", "w2"]);
  expect(tabs[1].dataset.active).toBe("true");
  expect(tabs[1].className).toContain("bg-ov-tab-on");
  expect(row.querySelector('[aria-label="Nouveau workspace"]')).not.toBeNull();
  await act(async () => root.unmount());
  host.remove();
});
