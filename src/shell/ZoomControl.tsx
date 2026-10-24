import { Minus, Plus } from "lucide-react";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { canvasStore, useCanvas } from "@/canvas/canvasStore";
import { stepZoom, zoomAroundCenter } from "@/canvas/zoom";
import { RoundButton } from "./ui";

/** "− 56 % +" at the bottom right (spec habillage §5.6); the percentage resets to 100 %. */
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
    <div className="pointer-events-auto flex h-8 items-center rounded-full border border-ov-line bg-ov-surface px-0.5 shadow-ov">
      <RoundButton label="Dézoomer" className="size-7" onClick={() => apply(stepZoom(zoom, -1))}>
        <Minus />
      </RoundButton>
      <button
        type="button"
        title="Revenir à 100 %"
        className="w-12 text-center font-mono text-xs text-ov-text-2 hover:text-ov-text"
        onClick={() => apply(1)}
      >
        {Math.round(zoom * 100)} %
      </button>
      <RoundButton label="Zoomer" className="size-7" onClick={() => apply(stepZoom(zoom, 1))}>
        <Plus />
      </RoundButton>
    </div>
  );
}
