// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { TOP_ROW_HEIGHT } from "@/shell/layout";
import { HomeScreen } from "./HomeScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockIPC((cmd) => (cmd === "list_projects" ? [] : undefined));
});
afterEach(() => clearMocks());

it("scrolls its header and cards below the window's drag strip, never under it", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<HomeScreen />));
  // Spec fenêtre §4.4: "Ajouter un projet", the cards and the scrollbar never sit
  // under the strip or the window buttons, even scrolled: the scroller itself
  // starts below the top row, so nothing it holds can scroll into it.
  let scroller = host.querySelector("header")!.parentElement;
  while (scroller && !scroller.className.includes("overflow-auto")) scroller = scroller.parentElement;
  expect(scroller).not.toBeNull();
  expect(parseFloat(scroller!.style.top)).toBeGreaterThanOrEqual(TOP_ROW_HEIGHT);
  await act(async () => root.unmount());
  host.remove();
});
