import { Minus, Plus } from "lucide-react";
import { useCanvas } from "@/canvas/canvasStore";
import { zoomTo } from "@/canvas/viewActions";
import { stepZoom } from "@/canvas/zoom";
import { IconButton } from "./buttons";

/** "− 56 % +" at the bottom right (spec identité §5.8); the percentage resets to 100 %. */
export function ZoomControl() {
  const zoom = useCanvas((s) => s.view.zoom);

  return (
    <div className="ov-glass-strong pointer-events-auto flex h-8 items-center rounded-[14px] px-0.5">
      <IconButton label="Dézoomer" onClick={() => zoomTo(stepZoom(zoom, -1))}>
        <Minus />
      </IconButton>
      <button
        type="button"
        title="Revenir à 100 %"
        className="w-12 text-center font-mono text-xs text-ov-text-2 hover:text-ov-text"
        onClick={() => zoomTo(1)}
      >
        {Math.round(zoom * 100)} %
      </button>
      <IconButton label="Zoomer" onClick={() => zoomTo(stepZoom(zoom, 1))}>
        <Plus />
      </IconButton>
    </div>
  );
}
