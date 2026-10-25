import { Minus, Plus } from "lucide-react";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { canvasStore, useCanvas } from "@/canvas/canvasStore";
import { stepZoom, zoomAroundCenter } from "@/canvas/zoom";
import { IconButton } from "./buttons";

/** "− 56 % +" at the bottom right (spec identité §5.8); the percentage resets to 100 %. */
export function ZoomControl() {
  const zoom = useCanvas((s) => s.view.zoom);

  const apply = (next: number) => {
    const { api, view } = canvasStore.getState();
    if (!api) return;
    const target = zoomAroundCenter(view, next);
    api.updateScene({
      appState: {
        zoom: { value: target.zoom as NormalizedZoomValue },
        scrollX: target.scrollX,
        scrollY: target.scrollY,
      },
    });
  };

  return (
    <div className="ov-glass pointer-events-auto flex h-8 items-center rounded-[14px] px-0.5">
      <IconButton label="Dézoomer" onClick={() => apply(stepZoom(zoom, -1))}>
        <Minus />
      </IconButton>
      <button
        type="button"
        title="Revenir à 100 %"
        className="w-12 text-center font-mono text-xs text-ov-text-2 hover:text-ov-text"
        onClick={() => apply(1)}
      >
        {Math.round(zoom * 100)} %
      </button>
      <IconButton label="Zoomer" onClick={() => apply(stepZoom(zoom, 1))}>
        <Plus />
      </IconButton>
    </div>
  );
}
