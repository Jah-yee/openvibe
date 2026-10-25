import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { canvasStore } from "./canvasStore";
import { groupInfoOf } from "./groups";
import { nodeKindOf } from "./nodeElement";

/**
 * Maj+Échap (spec fenêtre §6.5): the terminal or field that has the keyboard
 * loses it, the active terminal is deactivated, nothing gets selected, and the
 * keyboard goes to Excalidraw's container, where Excalidraw reads its keys
 * (OpenVibe does not set `handleKeyboardGlobally`).
 */
export function releaseToCanvas(doc: Document = document) {
  const active = doc.activeElement;
  if (active instanceof HTMLElement) active.blur();
  canvasStore.getState().api?.updateScene({ appState: { activeEmbeddable: null } });
  doc.querySelector<HTMLElement>(".excalidraw-container")?.focus();
}

/** What the overview frames: the nodes and their group frames; the whole scene without nodes. */
export function overviewTargets(elements: readonly ExcalidrawElement[]): ExcalidrawElement[] {
  const live = elements.filter((e) => !e.isDeleted);
  const nodes = live.filter((e) => {
    const kind = nodeKindOf(e);
    return kind === "terminal" || kind === "orchestrator";
  });
  if (nodes.length === 0) return live;
  const holding = new Set(nodes.map((n) => n.frameId));
  return [...live.filter((e) => e.type === "frame" && holding.has(e.id) && groupInfoOf(e) !== null), ...nodes];
}

/** Ctrl+Maj+A (spec fenêtre §6.6): every node in view, with an animation and a 10 % margin, then the keyboard to the canvas. */
export function overview() {
  const api = canvasStore.getState().api;
  if (!api) return;
  const targets = overviewTargets(api.getSceneElements());
  if (targets.length > 0) api.scrollToContent(targets, { fitToViewport: true, viewportZoomFactor: 0.9, animate: true });
  releaseToCanvas();
}
