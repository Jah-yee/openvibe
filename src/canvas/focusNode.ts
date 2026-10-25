import { focusTerminal } from "@/nodes/terminal/registry";
import { canvasStore, fullSizeView } from "./canvasStore";

/** The fleet panel's click: the view centered on the terminal at 100 %, and the keyboard to it (spec habillage §5.5). */
export function focusNode(nodeId: string) {
  const api = canvasStore.getState().api;
  const element = api?.getSceneElements().find((e) => e.id === nodeId);
  if (!api || !element) return;
  api.updateScene({ appState: fullSizeView(element, api.getAppState()) });
  focusTerminal(nodeId);
}
