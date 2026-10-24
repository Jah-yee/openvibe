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
      editingFrame: null,
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

describe("frames", () => {
  it("keeps the same frames object when the scene's frames did not change", () => {
    const frames = [{ id: "g", name: "G", x: 0, y: 0, width: 1, height: 1, group: null, memberIds: [] }];
    canvasStore.getState().setFrames(frames);
    canvasStore.getState().setFrames(frames.map((f) => ({ ...f })));
    expect(canvasStore.getState().frames).toBe(frames);
    canvasStore.getState().setFrames([]);
    expect(canvasStore.getState().frames).toEqual([]);
  });
});

describe("nodeIds", () => {
  it("keeps the same list when the scene's nodes did not change", () => {
    const ids = ["a", "b"];
    canvasStore.getState().setNodeIds(ids);
    canvasStore.getState().setNodeIds(["a", "b"]);
    expect(canvasStore.getState().nodeIds).toBe(ids);
    canvasStore.getState().setNodeIds([]);
  });
});
