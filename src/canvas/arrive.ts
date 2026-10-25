import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { focusTerminal } from "@/nodes/terminal/registry";
import { BOTTOM_BAR_HEIGHT, TOP_ROW_HEIGHT } from "@/shell/layout";
import { signalArrival } from "./arrivalSignal";
import { canvasStore } from "./canvasStore";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Viewport {
  scrollX: number;
  scrollY: number;
  zoom: number;
  width: number;
  height: number;
}

/**
 * The view stays when the terminal shows whole, at 100 %, in the zone utile:
 * the canvas less the bars at the top and the command bar's band at the
 * bottom (spec fenêtre §6.4, as amended by spec identité §7).
 */
export function needsMove(rect: Rect, view: Viewport): boolean {
  if (view.zoom !== 1) return true;
  const left = rect.x + view.scrollX;
  const top = rect.y + view.scrollY;
  return left < 0 || top < TOP_ROW_HEIGHT || left + rect.width > view.width || top + rect.height > view.height - BOTTOM_BAR_HEIGHT;
}

/** The terminal at 100 %, centered in the zone utile (plan E1, décision 1). */
export function arrivalView(rect: Rect, viewport: { width: number; height: number }) {
  const middle = (TOP_ROW_HEIGHT + viewport.height - BOTTOM_BAR_HEIGHT) / 2;
  return {
    zoom: { value: 1 as NormalizedZoomValue },
    scrollX: viewport.width / 2 - (rect.x + rect.width / 2),
    scrollY: middle - (rect.y + rect.height / 2),
  };
}

/**
 * Arrival on a terminal (spec fenêtre §6.4), shared by Ctrl+Tab and Ctrl+P:
 * the view moves only if needed; the terminal is activated as by a click in
 * its body, without selecting it, and the selection left behind is cleared:
 * the canvas keys (Suppr, arrows) must not act on a terminal out of sight.
 * xterm takes the keyboard on the next frame, once Excalidraw shows a
 * terminal that was off screen; its border flashes.
 */
export function arrive(nodeId: string) {
  const api = canvasStore.getState().api;
  const element = api?.getSceneElements().find((e) => e.id === nodeId);
  if (!api || !element) return;
  const app = api.getAppState();
  const view = { scrollX: app.scrollX, scrollY: app.scrollY, zoom: app.zoom.value, width: app.width, height: app.height };
  const move = needsMove(element, view) ? arrivalView(element, view) : {};
  api.updateScene({
    appState: { ...move, activeEmbeddable: { element, state: "active" }, selectedElementIds: {}, selectedGroupIds: {} },
  });
  requestAnimationFrame(() => focusTerminal(nodeId));
  signalArrival(nodeId);
}
