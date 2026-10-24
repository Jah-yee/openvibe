import { describe, expect, it, vi } from "vitest";
import type { AppState } from "@excalidraw/excalidraw/types";
import { canvasStore, EMPTY_VIEW, sameView, viewFrom } from "./canvasStore";

const appState = (overrides: Record<string, unknown> = {}) =>
  ({
    scrollX: 10,
    scrollY: -5,
    zoom: { value: 0.5 },
    width: 800,
    height: 600,
    offsetLeft: 0,
    offsetTop: 0,
    activeTool: { type: "rectangle" },
    selectedElementIds: { b: true, a: true },
    ...overrides,
  }) as unknown as AppState;

describe("viewFrom", () => {
  it("keeps what the shell shows, with sorted selected ids", () => {
    expect(viewFrom(appState())).toEqual({
      scrollX: 10,
      scrollY: -5,
      zoom: 0.5,
      width: 800,
      height: 600,
      offsetLeft: 0,
      offsetTop: 0,
      tool: "rectangle",
      selectedIds: ["a", "b"],
    });
  });
});

describe("canvasStore", () => {
  it("only notifies when the view really changes", () => {
    const listener = vi.fn();
    const unsubscribe = canvasStore.subscribe(listener);
    canvasStore.getState().setView(viewFrom(appState()));
    canvasStore.getState().setView(viewFrom(appState({ selectedElementIds: { a: true, b: true } })));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(sameView(EMPTY_VIEW, canvasStore.getState().view)).toBe(false);
    unsubscribe();
  });
});
