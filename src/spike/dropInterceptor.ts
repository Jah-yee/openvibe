import { viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { findTerminalAt } from "@/canvas/hitTest";

export const SNIPPET_MIME = "application/x-openvibe-snippet";

/**
 * Catches our own drag payloads in the capture phase, before Excalidraw turns
 * dropped text into a text element, and routes them to the terminal under the
 * pointer. Other drags are left to Excalidraw.
 */
export function installDropInterceptor(
  container: HTMLElement,
  api: ExcalidrawImperativeAPI,
  onSnippet: (nodeId: string, text: string) => void,
  onMiss: () => void,
): () => void {
  const isOurs = (event: DragEvent) => event.dataTransfer?.types.includes(SNIPPET_MIME) ?? false;
  const terminalAt = (event: DragEvent) => {
    const { x, y } = viewportCoordsToSceneCoords({ clientX: event.clientX, clientY: event.clientY }, api.getAppState());
    return findTerminalAt(api.getSceneElements(), x, y);
  };

  const onDragOver = (event: DragEvent) => {
    if (!isOurs(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer!.dropEffect = terminalAt(event) ? "copy" : "none";
  };

  const onDrop = (event: DragEvent) => {
    if (!isOurs(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const target = terminalAt(event);
    if (target) onSnippet(target.id, event.dataTransfer!.getData(SNIPPET_MIME));
    else onMiss();
  };

  container.addEventListener("dragover", onDragOver, true);
  container.addEventListener("drop", onDrop, true);
  return () => {
    container.removeEventListener("dragover", onDragOver, true);
    container.removeEventListener("drop", onDrop, true);
  };
}
