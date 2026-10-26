import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { createNodeElement } from "./nodeElement";
import { createSceneSync, liveNodeIds, liveNodeRects } from "./sceneSync";

const appState = (zoom = 1) => ({ scrollX: 0, scrollY: 0, zoom: { value: zoom } }) as unknown as AppState;
const noFiles = {} as BinaryFiles;

function setup(initial: readonly ExcalidrawElement[] = []) {
  const deps = {
    saveScene: vi.fn(() => Promise.resolve()),
    saveFiles: vi.fn(() => Promise.resolve()),
    onSceneChanged: vi.fn(),
    onNodesAdded: vi.fn(),
    onNodesRemoved: vi.fn(),
  };
  return { deps, sync: createSceneSync({ elements: initial, savedFileIds: ["known"] }, deps) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("saves the scene 500 ms after the last change, with only live elements and node ids", () => {
  const keep = createNodeElement("terminal", { x: 0, y: 0 });
  const gone = { ...createNodeElement("terminal", { x: 0, y: 0 }), isDeleted: true };
  const { deps, sync } = setup();
  sync.onChange([keep, gone], appState(), noFiles, 1);
  sync.onChange([keep, gone], appState(), noFiles, 2);
  vi.advanceTimersByTime(499);
  expect(deps.saveScene).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(deps.saveScene).toHaveBeenCalledTimes(1);
  const [elementsJson, appStateJson, nodeIds] = deps.saveScene.mock.calls[0] as unknown as [string, string, string[]];
  expect(JSON.parse(elementsJson).map((e: ExcalidrawElement) => e.id)).toEqual([keep.id]);
  expect(JSON.parse(appStateJson)).toEqual({ scrollX: 0, scrollY: 0, zoom: { value: 1 } });
  expect(nodeIds).toEqual([keep.id]);
});

it("ignores pointer moves (same version, same viewport)", () => {
  const { deps, sync } = setup();
  sync.onChange([], appState(), noFiles, 1);
  vi.advanceTimersByTime(500);
  sync.onChange([], appState(), noFiles, 1);
  vi.advanceTimersByTime(500);
  expect(deps.saveScene).toHaveBeenCalledTimes(1);
  expect(deps.onSceneChanged).toHaveBeenCalledTimes(1);
});

it("flush writes the pending save immediately", () => {
  const { deps, sync } = setup();
  sync.onChange([], appState(2), noFiles, 1);
  sync.flush();
  expect(deps.saveScene).toHaveBeenCalledTimes(1);
});

it("reports nodes that appear and disappear, but not the ones it started with", () => {
  const first = createNodeElement("terminal", { x: 0, y: 0 });
  const second = createNodeElement("terminal", { x: 0, y: 0 });
  const { deps, sync } = setup([first]);
  sync.onChange([first, second], appState(), noFiles, 1);
  expect(deps.onNodesAdded).toHaveBeenCalledWith([second.id]);
  sync.onChange([{ ...first, isDeleted: true }, second], appState(), noFiles, 2);
  expect(deps.onNodesRemoved).toHaveBeenCalledWith([first.id]);
  sync.onChange([first, second], appState(), noFiles, 3); // undo
  expect(deps.onNodesAdded).toHaveBeenLastCalledWith([first.id]);
});

it("saves each new image once, as a data URL", () => {
  const { deps, sync } = setup();
  const files = {
    known: { id: "known", mimeType: "image/png", dataURL: "data:old", created: 1 },
    fresh: { id: "fresh", mimeType: "image/svg+xml", dataURL: "data:new", created: 2 },
  } as unknown as BinaryFiles;
  sync.onChange([], appState(), files, 1);
  sync.onChange([], appState(), files, 2);
  expect(deps.saveFiles).toHaveBeenCalledTimes(1);
  expect(deps.saveFiles).toHaveBeenCalledWith([
    { id: "fresh", mimeType: "image/svg+xml", dataUrl: "data:new", created: 2 },
  ]);
});

it("liveNodeIds skips deleted nodes and plain drawings", () => {
  const node = createNodeElement("note", { x: 0, y: 0 });
  const drawing = { ...createNodeElement("note", { x: 0, y: 0 }), type: "rectangle" } as unknown as ExcalidrawElement;
  expect(liveNodeIds([node, drawing, { ...node, id: "x", isDeleted: true }])).toEqual([node.id]);
});

it("liveNodeRects gives the scene rectangle of each live node, the frieze's anchor", () => {
  const node = createNodeElement("terminal", { x: 0, y: 0 });
  const drawing = { ...node, id: "d", type: "rectangle" } as unknown as ExcalidrawElement;
  expect(liveNodeRects([node, drawing, { ...node, id: "x", isDeleted: true }])).toEqual({
    [node.id]: { x: node.x, y: node.y, width: node.width, height: node.height },
  });
});
