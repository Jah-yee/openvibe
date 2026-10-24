import type { CanvasView } from "./canvasStore";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;

/** Zoom of the − and + buttons: 10 % steps, like Excalidraw's own controls. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const next = Math.round((zoom + direction * 0.1) * 10) / 10;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
}

/** New zoom and scroll that keep the scene point at the viewport center in place. */
export function zoomAroundCenter(
  view: Pick<CanvasView, "scrollX" | "scrollY" | "zoom" | "width" | "height">,
  zoom: number,
): { zoom: number; scrollX: number; scrollY: number } {
  const centerX = view.width / 2 / view.zoom - view.scrollX;
  const centerY = view.height / 2 / view.zoom - view.scrollY;
  return { zoom, scrollX: view.width / 2 / zoom - centerX, scrollY: view.height / 2 / zoom - centerY };
}
