import { TOP_ROW_HEIGHT } from "./layout";

/**
 * The window's title bar (spec fenêtre §4.2): the empty space of the top row
 * moves the window, a double-click maximizes it. Tauri's injected script reads
 * the bare attribute as "clicks on this element only", so the pills drawn over
 * the strip stay clickable.
 */
export function DragStrip() {
  return (
    <div
      data-tauri-drag-region=""
      aria-hidden
      className="fixed inset-x-0 top-0 z-20"
      style={{ height: TOP_ROW_HEIGHT }}
    />
  );
}
