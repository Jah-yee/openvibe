// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { focusTerminal } from "@/nodes/terminal/registry";
import { arrivalStore } from "./arrivalSignal";
import { arrivalView, arrive, needsMove } from "./arrive";
import { canvasStore } from "./canvasStore";

vi.mock("@/nodes/terminal/registry", () => ({ focusTerminal: vi.fn() }));

const viewport = { width: 1400, height: 900 };
const at100 = { scrollX: 0, scrollY: 0, zoom: 1, ...viewport };
const isis = { id: "isis", x: 100, y: 200, width: 720, height: 440 };

describe("needsMove (spec fenêtre §6.4, zone utile of spec identité §7)", () => {
  it("keeps the view when the terminal shows whole at 100 % in the zone utile", () => {
    expect(needsMove(isis, at100)).toBe(false);
  });

  it("moves it when the terminal is zoomed, under the bars, under the bottom band or off screen", () => {
    expect(needsMove(isis, { ...at100, zoom: 0.8 })).toBe(true);
    expect(needsMove({ ...isis, y: 60 }, at100)).toBe(true);
    expect(needsMove({ ...isis, y: 900 - 60 - 440 + 1 }, at100)).toBe(true);
    expect(needsMove({ ...isis, x: -10 }, at100)).toBe(true);
    expect(needsMove({ ...isis, x: 1400 - 720 + 1 }, at100)).toBe(true);
    expect(needsMove(isis, { ...at100, scrollY: -150 })).toBe(true);
  });
});

it("centers a moved terminal at 100 % in the zone utile", () => {
  const view = arrivalView(isis, viewport);
  expect(view.zoom.value).toBe(1);
  // Screen top of the terminal: equal margins under the 72 px bars and above the 60 px band.
  const top = isis.y + view.scrollY;
  expect(top - 72).toBe(900 - 60 - (top + isis.height));
  expect(isis.x + view.scrollX).toBe((1400 - 720) / 2);
});

describe("arrive", () => {
  let frames: FrameRequestCallback[];
  const updateScene = vi.fn();

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    updateScene.mockClear();
    vi.mocked(focusTerminal).mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  const withScene = (appState: Record<string, unknown>) =>
    canvasStore.setState({
      api: {
        getSceneElements: () => [isis],
        getAppState: () => ({ ...appState, zoom: { value: appState.zoom } }),
        updateScene,
      } as unknown as ExcalidrawImperativeAPI,
    });

  it("activates the terminal without moving a view that already shows it, clears the selection, and flashes it", () => {
    withScene(at100);
    const before = arrivalStore.getState().seq;
    arrive("isis");
    // No stale selection left behind: the canvas keys (Suppr, arrows) must not act on a terminal out of sight.
    expect(updateScene).toHaveBeenCalledWith({
      appState: { activeEmbeddable: { element: isis, state: "active" }, selectedElementIds: {}, selectedGroupIds: {} },
    });
    expect(arrivalStore.getState()).toEqual({ nodeId: "isis", seq: before + 1 });
  });

  it("moves the view first when needed, then focuses xterm on the next frame, after the view moved", () => {
    withScene({ ...at100, zoom: 0.5 });
    arrive("isis");
    const { appState } = updateScene.mock.calls[0][0];
    expect(appState.zoom.value).toBe(1);
    expect(appState.activeEmbeddable).toEqual({ element: isis, state: "active" });
    expect(focusTerminal).not.toHaveBeenCalled();
    frames.forEach((frame) => frame(0));
    expect(focusTerminal).toHaveBeenCalledWith("isis");
  });

  it("does nothing for a terminal that is not on the canvas", () => {
    withScene(at100);
    arrive("closed");
    expect(updateScene).not.toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });
});
