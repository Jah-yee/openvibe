import { createStore, useStore } from "zustand";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { sameFrames, type SceneFrame } from "./groups";

/** The part of Excalidraw's state that the shell around the canvas shows. */
export interface CanvasView {
  scrollX: number;
  scrollY: number;
  zoom: number;
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
  /** Excalidraw's active tool type ("selection", "rectangle", "freedraw"…). */
  tool: string;
  selectedIds: string[];
  /** The frame whose name Excalidraw is editing (its group label hides meanwhile). */
  editingFrame: string | null;
}

export const EMPTY_VIEW: CanvasView = {
  scrollX: 0,
  scrollY: 0,
  zoom: 1,
  width: 0,
  height: 0,
  offsetLeft: 0,
  offsetTop: 0,
  tool: "selection",
  selectedIds: [],
  editingFrame: null,
};

export function viewFrom(appState: AppState): CanvasView {
  return {
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
    zoom: appState.zoom.value,
    width: appState.width,
    height: appState.height,
    offsetLeft: appState.offsetLeft,
    offsetTop: appState.offsetTop,
    tool: appState.activeTool.type,
    selectedIds: Object.keys(appState.selectedElementIds)
      .filter((id) => appState.selectedElementIds[id])
      .sort(),
    editingFrame: appState.editingFrame ?? null,
  };
}

export function sameView(a: CanvasView, b: CanvasView): boolean {
  return (
    a.scrollX === b.scrollX &&
    a.scrollY === b.scrollY &&
    a.zoom === b.zoom &&
    a.width === b.width &&
    a.height === b.height &&
    a.offsetLeft === b.offsetLeft &&
    a.offsetTop === b.offsetTop &&
    a.tool === b.tool &&
    a.editingFrame === b.editingFrame &&
    a.selectedIds.length === b.selectedIds.length &&
    a.selectedIds.every((id, i) => id === b.selectedIds[i])
  );
}

interface CanvasState {
  /** The Excalidraw instance of the workspace on screen. */
  api: ExcalidrawImperativeAPI | null;
  view: CanvasView;
  setApi: (api: ExcalidrawImperativeAPI | null) => void;
  /** Called on every Excalidraw onChange; listeners only hear real changes. */
  setView: (view: CanvasView) => void;
  /** Frames and groups of the scene on screen, derived on every change (spec §11.1). */
  frames: SceneFrame[];
  setFrames: (frames: SceneFrame[]) => void;
}

export const canvasStore = createStore<CanvasState>()((set, get) => ({
  api: null,
  view: EMPTY_VIEW,
  setApi: (api) => set({ api }),
  setView: (view) => {
    if (!sameView(get().view, view)) set({ view });
  },
  frames: [],
  setFrames: (frames) => {
    if (!sameFrames(get().frames, frames)) set({ frames });
  },
}));

export function useCanvas<T>(selector: (state: CanvasState) => T): T {
  return useStore(canvasStore, selector);
}
