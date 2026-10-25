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

it("starts its header below the window's drag strip, at any width", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<HomeScreen />));
  const content = host.querySelector("header")!.parentElement!;
  // Spec fenêtre §4.4: "Ajouter un projet" never sits under the strip or the window buttons.
  expect(parseFloat(content.style.paddingTop)).toBeGreaterThan(TOP_ROW_HEIGHT);
  await act(async () => root.unmount());
  host.remove();
});
