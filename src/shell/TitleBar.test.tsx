// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { TITLE_BAR_HEIGHT } from "./layout";
import { TitleBar } from "./TitleBar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockWindows("main");
  mockIPC((cmd) => (cmd === "plugin:window|is_maximized" ? false : undefined), { shouldMockEvents: true });
});
afterEach(() => clearMocks());

it("moves the window from its empty space only, with the logo, its content and the window buttons", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<TitleBar leading={<button type="button">mk-webapp</button>} trailing={<span>3</span>} />));
  const bar = host.firstElementChild as HTMLElement;
  expect(bar.style.height).toBe(`${TITLE_BAR_HEIGHT}px`);
  // Bare attributes: Tauri drags only on clicks aimed at the bar or its spacer.
  const regions = [...host.querySelectorAll("[data-tauri-drag-region]")];
  expect(regions.map((r) => r.getAttribute("data-tauri-drag-region"))).toEqual(["", ""]);
  expect(regions[0]).toBe(bar);
  expect(regions[1].querySelector("button")).toBeNull();
  expect(bar.querySelector("svg path")!.getAttribute("stroke")).toBe("#D97757");
  for (const label of ["Réduire", "Agrandir", "Fermer OpenVibe"]) expect(host.querySelector(`[aria-label="${label}"]`)).not.toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

it("centers its middle element on the window, which does not drag", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<TitleBar leading={<span>OpenVibe</span>} center={<button type="button">Rechercher</button>} />));
  const center = [...host.querySelectorAll("button")].find((b) => b.textContent === "Rechercher")!;
  expect(center.parentElement!.className).toContain("left-1/2");
  expect(center.closest("[data-tauri-drag-region]")).toBe(host.firstElementChild);
  await act(async () => root.unmount());
  host.remove();
});
