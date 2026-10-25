import { expect, it } from "vitest";
import type { AppState } from "@excalidraw/excalidraw/types";
import { createActivationTracker } from "./activation";
import { createNodeElement } from "./nodeElement";

const active = (element: object, state: "active" | "hover" = "active") =>
  ({ element, state }) as unknown as AppState["activeEmbeddable"];

it("reports a terminal once when it becomes active", () => {
  const track = createActivationTracker();
  const terminal = createNodeElement("terminal", { x: 0, y: 0 });
  expect(track(active(terminal))).toBe(terminal.id);
  expect(track(active(terminal))).toBeNull();
  expect(track(null)).toBeNull();
  expect(track(active(terminal))).toBe(terminal.id);
});

it("ignores hovering and other node kinds", () => {
  const track = createActivationTracker();
  expect(track(active(createNodeElement("terminal", { x: 0, y: 0 }), "hover"))).toBeNull();
  expect(track(active(createNodeElement("note", { x: 0, y: 0 })))).toBeNull();
});
