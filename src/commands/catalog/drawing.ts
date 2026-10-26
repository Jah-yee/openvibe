import { releaseToCanvas } from "@/canvas/canvasFocus";
import { canvasStore } from "@/canvas/canvasStore";
import { clientOf } from "@/fleet/placement";
import type { Point } from "@/fleet/terminals";
import { CANVAS_KEYS, copyCanvasSelection, openNativeMenuAt, pasteOnCanvasAt, pressCanvasKey, startTextAt } from "@/radial/bridges";
import { exportCurrentPng, exportCurrentScene, importIntoScene } from "@/shell/sceneActions";
import type { Command, CommandContext } from "../command";
import { inProject } from "./navigation";

type Tool = "selection" | "hand" | "rectangle" | "ellipse" | "diamond" | "line" | "arrow" | "frame" | "text" | "freedraw" | "eraser" | "image";

/** The tools of the rail and the shapes menu, with the one-letter key Excalidraw gives them. */
const TOOLS: readonly { label: string; type: Tool; keys?: string }[] = [
  { label: "Sélection", type: "selection", keys: "V" },
  { label: "Main", type: "hand", keys: "H" },
  { label: "Rectangle", type: "rectangle", keys: "R" },
  { label: "Ellipse", type: "ellipse", keys: "O" },
  { label: "Losange", type: "diamond", keys: "D" },
  { label: "Ligne", type: "line", keys: "L" },
  { label: "Flèche", type: "arrow", keys: "A" },
  { label: "Cadre", type: "frame", keys: "F" },
  { label: "Texte", type: "text", keys: "T" },
  { label: "Stylo", type: "freedraw", keys: "P" },
  { label: "Gomme", type: "eraser", keys: "E" },
  { label: "Image", type: "image" },
];

/** A drawing tool, then the keyboard to the canvas (spec fenêtre §7.3). */
function pickTool(type: Tool) {
  canvasStore.getState().api?.setActiveTool({ type });
  releaseToCanvas();
}

/**
 * Annuler / Rétablir: Excalidraw's own keys, sent to its container (its API has
 * no undo). The keyboard goes back to the canvas after: Excalidraw computes the
 * undo from the state of the moment, which would overwrite a release still pending.
 */
function pressUndoKey(key: "z" | "y") {
  const container = document.querySelector<HTMLElement>(".excalidraw-container");
  container?.dispatchEvent(new KeyboardEvent("keydown", { key, code: key === "z" ? "KeyZ" : "KeyY", ctrlKey: true, bubbles: true, cancelable: true }));
  releaseToCanvas();
}

/** The ids Excalidraw has selected. */
function selectedIds(): string[] {
  const selection = canvasStore.getState().api?.getAppState().selectedElementIds ?? {};
  return Object.keys(selection).filter((id) => selection[id]);
}

/** Every selected element is locked: « Déverrouiller », as Excalidraw's own menu says. */
export function selectionLocked(): boolean {
  const ids = new Set(selectedIds());
  const selected = canvasStore.getState().api?.getSceneElements().filter((e) => ids.has(e.id)) ?? [];
  return selected.length > 0 && selected.every((e) => e.locked);
}

const withSelection = (ctx: CommandContext) => inProject(ctx) && selectedIds().length > 0;

/** The window point of the radial menu's click, else the middle of the canvas. */
function pointOf(ctx: CommandContext): Point {
  const { view } = canvasStore.getState();
  return ctx.at ? clientOf(ctx.at, view) : { x: view.offsetLeft + view.width / 2, y: view.offsetTop + view.height / 2 };
}

export const DRAWING: readonly Command[] = [
  ...TOOLS.map(
    ({ label, type, keys }): Command => ({
      id: `tool.${type}`,
      label,
      section: "Dessin",
      keywords: ["outil", "dessin", label],
      keys,
      available: inProject,
      run: (ctx) => (type === "text" && ctx.at ? startTextAt(pointOf(ctx)) : pickTool(type)),
    }),
  ),
  { id: "edit.undo", label: "Annuler", section: "Dessin", keywords: ["annuler", "défaire"], keys: "Ctrl+Z", available: inProject, run: () => pressUndoKey("z") },
  { id: "edit.redo", label: "Rétablir", section: "Dessin", keywords: ["rétablir", "refaire"], keys: "Ctrl+Y", available: inProject, run: () => pressUndoKey("y") },
  { id: "drawing.copy", label: "Copier", section: "Dessin", keywords: ["copier", "presse-papiers"], keys: "Ctrl+C", available: withSelection, run: () => copyCanvasSelection() },
  { id: "drawing.paste", label: "Coller", section: "Dessin", keywords: ["coller", "presse-papiers"], keys: "Ctrl+V", available: inProject, run: (ctx) => pasteOnCanvasAt(pointOf(ctx)) },
  { id: "drawing.duplicate", label: "Dupliquer", section: "Dessin", keywords: ["dupliquer", "copie"], keys: "Ctrl+D", available: withSelection, run: () => pressCanvasKey(CANVAS_KEYS.duplicate) },
  { id: "drawing.front", label: "Premier plan", section: "Dessin", keywords: ["devant", "ordre", "plan"], keys: "Ctrl+Maj+]", available: withSelection, run: () => pressCanvasKey(CANVAS_KEYS.front) },
  { id: "drawing.back", label: "Arrière-plan", section: "Dessin", keywords: ["derrière", "ordre", "plan"], keys: "Ctrl+Maj+[", available: withSelection, run: () => pressCanvasKey(CANVAS_KEYS.back) },
  {
    id: "drawing.lock",
    label: () => (selectionLocked() ? "Déverrouiller" : "Verrouiller"),
    section: "Dessin",
    keywords: ["verrouiller", "déverrouiller", "figer"],
    keys: "Ctrl+Maj+L",
    available: withSelection,
    run: () => pressCanvasKey(CANVAS_KEYS.lock),
  },
  // Agents in the selection go through the closing guard (spec habillage §7.5).
  { id: "drawing.delete", label: "Supprimer", section: "Dessin", keywords: ["supprimer", "effacer"], keys: "Suppr", available: withSelection, run: () => pressCanvasKey(CANVAS_KEYS.delete) },
  // The radial menu's only: Excalidraw's full menu at its point (spec menu radial §4.5).
  { id: "drawing.more", label: "Plus…", section: "Dessin", keywords: ["menu", "plus"], available: (ctx) => withSelection(ctx) && ctx.at !== undefined, run: (ctx) => openNativeMenuAt(pointOf(ctx)) },
];

export const SCENE: readonly Command[] = [
  { id: "scene.export", label: "Exporter la scène…", section: "Scène", keywords: ["exporter", "fichier", "scène"], available: inProject, run: () => exportCurrentScene() },
  { id: "scene.import", label: "Importer une scène…", section: "Scène", keywords: ["importer", "fichier", "scène"], available: inProject, run: () => importIntoScene() },
  { id: "scene.png", label: "Exporter en PNG…", section: "Scène", keywords: ["image", "png", "exporter"], available: inProject, run: () => exportCurrentPng() },
];
