// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { domTarget, isTextField, sceneTarget, type ScenePick } from "./target";

const element = (id: string, fields: Record<string, unknown>) =>
  ({ id, type: "rectangle", x: 0, y: 0, width: 100, height: 100, angle: 0, strokeWidth: 2, isDeleted: false, frameId: null, ...fields }) as unknown as ExcalidrawElement;
const pick = (point: { x: number; y: number }, elements: ExcalidrawElement[], fields: Partial<ScenePick> = {}): ScenePick => ({
  point,
  zoom: 1,
  elements,
  selectedIds: [],
  groupIds: new Set(),
  ...fields,
});

describe("what is under a right press (spec menu radial §6.4)", () => {
  it("reads a node's body from the page, and leaves text fields their own right click", () => {
    document.body.innerHTML =
      '<div data-terminal="isis"><div class="xterm"><span id="text"></span><textarea id="xterm-input"></textarea></div><input id="name" /></div><div data-orchestrator="chef"><span id="chef"></span><textarea id="field"></textarea></div><div id="else"></div>';
    const at = (id: string) => document.getElementById(id)!;
    expect(domTarget(at("text"))).toEqual({ kind: "terminal", id: "isis" });
    expect(domTarget(at("chef"))).toEqual({ kind: "orchestrator", id: "chef" });
    expect(domTarget(at("else"))).toBeNull();
    expect([isTextField(at("xterm-input")), isTextField(at("name")), isTextField(at("field")), isTextField(at("text"))]).toEqual([false, true, true, false]);
  });

  it("finds the topmost drawing by its outline, turned with it", () => {
    const below = element("below", {});
    const above = element("above", { x: 50, y: 50 });
    expect(sceneTarget(pick({ x: 60, y: 60 }, [below, above]))).toEqual({ kind: "selection", ids: ["above"] });
    expect(sceneTarget(pick({ x: 10, y: 10 }, [below, above]))).toEqual({ kind: "selection", ids: ["below"] });
    // A square turned by 45°: its unturned corner is empty.
    const turned = element("turned", { angle: Math.PI / 4 });
    expect(sceneTarget(pick({ x: 2, y: 2 }, [turned]))).toEqual({ kind: "canvas" });
    expect(sceneTarget(pick({ x: 50, y: 5 }, [turned]))).toEqual({ kind: "selection", ids: ["turned"] });
  });

  it("finds a line by its stroke, not by the box around it", () => {
    const line = element("line", { type: "line", width: 200, height: 200, points: [[0, 0], [200, 200]] });
    expect(sceneTarget(pick({ x: 103, y: 100 }, [line]))).toEqual({ kind: "selection", ids: ["line"] });
    expect(sceneTarget(pick({ x: 150, y: 50 }, [line]))).toEqual({ kind: "canvas" });
    expect(sceneTarget(pick({ x: 120, y: 100 }, [line], { zoom: 0.2 }))).toEqual({ kind: "selection", ids: ["line"] });
  });

  it("keeps the selection when the press is inside it, a lone node excepted", () => {
    const a = element("a", {});
    const b = element("b", { x: 300 });
    expect(sceneTarget(pick({ x: 200, y: 50 }, [a, b], { selectedIds: ["a", "b"] }))).toEqual({ kind: "selection", ids: ["a", "b"] });
    const terminal = element("isis", { type: "embeddable", customData: { kind: "terminal" } });
    expect(sceneTarget(pick({ x: 50, y: 50 }, [terminal], { selectedIds: ["isis"] }))).toEqual({ kind: "terminal", id: "isis" });
  });

  it("finds a node drawn on the canvas, a group by its frame or its label, an ordinary frame as a drawing", () => {
    const chef = element("chef", { type: "embeddable", customData: { kind: "orchestrator" }, x: 500 });
    const group = element("g1", { type: "frame", x: 0, y: 200, width: 400, height: 300 });
    const plain = element("f2", { type: "frame", x: 600, y: 200, width: 200, height: 200 });
    const member = element("ra", { type: "embeddable", customData: { kind: "terminal" }, x: 20, y: 220, frameId: "g1" });
    const scene = [group, plain, member, chef];
    const groups = { groupIds: new Set(["g1"]) };
    expect(sceneTarget(pick({ x: 550, y: 50 }, scene, groups))).toEqual({ kind: "orchestrator", id: "chef" });
    expect(sceneTarget(pick({ x: 50, y: 250 }, scene, groups))).toEqual({ kind: "terminal", id: "ra" });
    expect(sceneTarget(pick({ x: 300, y: 450 }, scene, groups))).toEqual({ kind: "group", id: "g1" });
    expect(sceneTarget(pick({ x: 50, y: 185 }, scene, groups))).toEqual({ kind: "group", id: "g1" });
    expect(sceneTarget(pick({ x: 700, y: 300 }, scene, groups))).toEqual({ kind: "selection", ids: ["f2"] });
    expect(sceneTarget(pick({ x: 900, y: 900 }, scene, groups))).toEqual({ kind: "canvas" });
  });
});
