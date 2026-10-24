import type { ExcalidrawInitialDataState, UIOptions } from "@excalidraw/excalidraw/types";
import { toSceneColor } from "@/theme/sceneColors";

/** Excalidraw 0.18.1's FONT_FAMILY["Comic Shanns"], its "code" font (a constant: tests cannot load Excalidraw). */
export const COMIC_SHANNS = 8;

/**
 * New elements get cream strokes and Comic Shanns text; the canvas itself is
 * transparent so the dot grid shows through (spec habillage §4.2, §5.7).
 */
export const SCENE_DEFAULTS = {
  viewBackgroundColor: "transparent",
  currentItemStrokeColor: toSceneColor("#EDE8DF"),
  currentItemFontFamily: COMIC_SHANNS,
  gridModeEnabled: false,
};

export function withSceneDefaults(initial: ExcalidrawInitialDataState): ExcalidrawInitialDataState {
  return { ...initial, appState: { ...SCENE_DEFAULTS, ...initial.appState } };
}

/** Excalidraw's canvas actions all move to the shell's menus. */
export const EXCALIDRAW_UI_OPTIONS: UIOptions = {
  canvasActions: {
    changeViewBackgroundColor: false,
    clearCanvas: false,
    export: false,
    loadScene: false,
    saveToActiveFile: false,
    toggleTheme: false,
    saveAsImage: false,
  },
  tools: { image: true },
};
