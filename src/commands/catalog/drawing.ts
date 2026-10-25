import { releaseToCanvas } from "@/canvas/canvasFocus";
import { canvasStore } from "@/canvas/canvasStore";
import { exportCurrentPng, exportCurrentScene, importIntoScene } from "@/shell/sceneActions";
import type { Command } from "../command";
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

/** Annuler / Rétablir: Excalidraw's own keys, sent to its container (its API has no undo). */
function pressCanvasKey(key: "z" | "y") {
  releaseToCanvas();
  const container = document.querySelector<HTMLElement>(".excalidraw-container");
  container?.dispatchEvent(new KeyboardEvent("keydown", { key, code: key === "z" ? "KeyZ" : "KeyY", ctrlKey: true, bubbles: true, cancelable: true }));
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
      run: () => pickTool(type),
    }),
  ),
  { id: "edit.undo", label: "Annuler", section: "Dessin", keywords: ["annuler", "défaire"], keys: "Ctrl+Z", available: inProject, run: () => pressCanvasKey("z") },
  { id: "edit.redo", label: "Rétablir", section: "Dessin", keywords: ["rétablir", "refaire"], keys: "Ctrl+Y", available: inProject, run: () => pressCanvasKey("y") },
];

export const SCENE: readonly Command[] = [
  { id: "scene.export", label: "Exporter la scène…", section: "Scène", keywords: ["exporter", "fichier", "scène"], available: inProject, run: () => exportCurrentScene() },
  { id: "scene.import", label: "Importer une scène…", section: "Scène", keywords: ["importer", "fichier", "scène"], available: inProject, run: () => importIntoScene() },
  { id: "scene.png", label: "Exporter en PNG…", section: "Scène", keywords: ["image", "png", "exporter"], available: inProject, run: () => exportCurrentPng() },
];
