import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { focusTerminal } from "@/nodes/terminal/registry";
import { canvasStore } from "./canvasStore";

/** The fleet panel's click: the view centered on the terminal at 100 %, and the keyboard to it (spec habillage §5.5). */
export function focusNode(nodeId: string) {
  const api = canvasStore.getState().api;
  const element = api?.getSceneElements().find((e) => e.id === nodeId);
  if (!api || !element) return;
  api.updateScene({ appState: { zoom: { value: 1 as NormalizedZoomValue } } });
  api.scrollToContent(element, { animate: true, duration: 200 });
  focusTerminal(nodeId);
}
