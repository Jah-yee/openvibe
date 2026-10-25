// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { projectsStore } from "@/store/projects";
import { ProjectPicker } from "./ProjectPicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => mockIPC(() => undefined));
afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
});

it("names the open project in the title bar and closes it from its menu (spec identité §5.1)", async () => {
  projectsStore.setState({
    projects: [
      { id: "p1", name: "mk-webapp", path: "C:/code/mk-webapp", position: 0, lastOpenedAt: 1, workspaceCount: 1, missing: false, liveAgents: 0 },
    ],
    activeId: "p1",
  } as never);
  const close = vi.spyOn(projectsStore.getState(), "close").mockResolvedValue();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<ProjectPicker />));
  const trigger = host.querySelector("button")!;
  expect(trigger.textContent).toBe("mk-webapp");
  await act(async () => trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  expect(items.map((i) => i.textContent)).toEqual(["mk-webapp", "Tous les projets…", "Fermer le projet"]);
  await act(async () => items[2].click());
  expect(close).toHaveBeenCalled();
  await act(async () => root.unmount());
  host.remove();
});
