// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { DragStrip } from "./DragStrip";
import { TOP_ROW_HEIGHT } from "./layout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("moves the window from its own empty space only, across the top row", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<DragStrip />));
  const strip = host.firstElementChild as HTMLElement;
  // A bare attribute: Tauri's script drags only on clicks that target the strip
  // itself, so the pills and menus drawn over it stay clickable.
  expect(strip.getAttribute("data-tauri-drag-region")).toBe("");
  expect(strip.childElementCount).toBe(0);
  expect(strip.style.height).toBe(`${TOP_ROW_HEIGHT}px`);
  expect(TOP_ROW_HEIGHT).toBe(72);
  await act(async () => root.unmount());
  host.remove();
});
