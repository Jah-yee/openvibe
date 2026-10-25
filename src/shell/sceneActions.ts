import { toast } from "sonner";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { currentTheme } from "@/app/theme";
import { canvasStore } from "@/canvas/canvasStore";
import { workspacesStore } from "@/store/workspaces";
import { exportPng, exportScene, importScene } from "./sceneFiles";

function run(action: (api: ExcalidrawImperativeAPI) => Promise<boolean>, failure: string) {
  const api = canvasStore.getState().api;
  if (!api) return;
  action(api).catch((error: unknown) => toast.error(`${failure} : ${String(error)}`));
}

/** The file name of the scene on screen: its workspace's. */
function sceneName(): string {
  const { workspaces, activeId } = workspacesStore.getState();
  return workspaces.find((w) => w.id === activeId)?.name ?? "scene";
}

/** « Exporter la scène… » of the settings menu and the palette. */
export const exportCurrentScene = () => run((api) => exportScene(api, sceneName()), "Export impossible");

/** « Importer une scène… ». */
export const importIntoScene = () => run(importScene, "Import impossible");

/** « Exporter en PNG… », in the app's theme. */
export const exportCurrentPng = () => run((api) => exportPng(api, sceneName(), currentTheme()), "Export impossible");
