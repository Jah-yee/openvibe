// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { canvasStore } from "@/canvas/canvasStore";
import { exportCurrentPng, exportCurrentScene, importIntoScene } from "@/shell/sceneActions";
import { labelOf, type CommandContext } from "../command";
import { DRAWING, SCENE } from "./drawing";

vi.mock("@excalidraw/excalidraw", () => ({}));
vi.mock("@/shell/sceneActions", () => ({ exportCurrentScene: vi.fn(), importIntoScene: vi.fn(), exportCurrentPng: vi.fn() }));

const busy: CommandContext = { project: true, workspaceId: "w1", terminalCount: 0, terminalId: null };
const setActiveTool = vi.fn();
const updateScene = vi.fn();
let container: HTMLDivElement;
const keys: KeyboardEvent[] = [];

beforeEach(() => {
  setActiveTool.mockClear();
  keys.length = 0;
  canvasStore.setState({ api: { setActiveTool, updateScene } as unknown as ExcalidrawImperativeAPI });
  document.body.innerHTML = '<div class="excalidraw excalidraw-container" tabindex="0"></div><textarea></textarea>';
  container = document.querySelector<HTMLDivElement>(".excalidraw-container")!;
  container.addEventListener("keydown", (e) => keys.push(e));
});
afterEach(() => document.body.replaceChildren());

describe("Dessin (spec fenêtre §7.3)", () => {
  it("lists the tools, the hand included, with Excalidraw's keys, then Annuler and Rétablir", () => {
    expect(DRAWING.map((c) => [labelOf(c, busy), c.keys ?? null])).toEqual([
      ["Sélection", "V"],
      ["Main", "H"],
      ["Rectangle", "R"],
      ["Ellipse", "O"],
      ["Losange", "D"],
      ["Ligne", "L"],
      ["Flèche", "A"],
      ["Cadre", "F"],
      ["Texte", "T"],
      ["Stylo", "P"],
      ["Gomme", "E"],
      ["Image", null],
      ["Annuler", "Ctrl+Z"],
      ["Rétablir", "Ctrl+Y"],
    ]);
  });

  it("picks a tool and gives the keyboard to the canvas", async () => {
    document.querySelector("textarea")!.focus();
    await DRAWING.find((c) => c.id === "tool.rectangle")!.run(busy);
    expect(setActiveTool).toHaveBeenCalledWith({ type: "rectangle" });
    expect(document.activeElement).toBe(container);
  });

  it("undoes and redoes with Excalidraw's own keys, sent to its container", async () => {
    await DRAWING.find((c) => c.id === "edit.undo")!.run(busy);
    await DRAWING.find((c) => c.id === "edit.redo")!.run(busy);
    expect(keys.map((k) => [k.key, k.ctrlKey])).toEqual([
      ["z", true],
      ["y", true],
    ]);
  });
});

describe("Scène", () => {
  it("exports, imports and saves a PNG as the settings menu does", async () => {
    expect(SCENE.map((c) => labelOf(c, busy))).toEqual(["Exporter la scène…", "Importer une scène…", "Exporter en PNG…"]);
    for (const command of SCENE) await command.run(busy);
    expect([exportCurrentScene, importIntoScene, exportCurrentPng].every((f) => vi.mocked(f).mock.calls.length === 1)).toBe(true);
  });
});
