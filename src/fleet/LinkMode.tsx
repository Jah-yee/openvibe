import { useEffect, useState } from "react";
import { canvasStore, useCanvas } from "@/canvas/canvasStore";
import { uiStore, useUi } from "@/store/ui";
import { linkOrchestrator } from "./orchestrators";
import { clientRectOf, sceneOf } from "./placement";
import type { Point } from "./terminals";
import { linkTargetAt } from "./wires";

/** "Relier" (spec habillage §13): each click wires a group or a terminal; Escape or a click in the void ends it. */
export function LinkMode() {
  const linking = useUi((s) => s.linking);
  const view = useCanvas((s) => s.view);
  const frames = useCanvas((s) => s.frames);
  const [pointer, setPointer] = useState<Point | null>(null);

  useEffect(() => {
    if (!linking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") uiStore.getState().setLinking(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [linking]);

  if (!linking) return null;
  const elements = canvasStore.getState().api?.getSceneElements() ?? [];
  const targetAt = (client: Point) => linkTargetAt(elements, frames, sceneOf(client, view));
  const hovered = pointer ? targetAt(pointer) : null;
  const rect = hovered ? (frames.find((f) => f.id === hovered) ?? elements.find((e) => e.id === hovered)) : undefined;

  return (
    <div
      className="fixed inset-0 z-40 cursor-crosshair"
      onPointerMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => {
        e.preventDefault();
        uiStore.getState().setLinking(null);
      }}
      onClick={(e) => {
        const target = targetAt({ x: e.clientX, y: e.clientY });
        if (target) linkOrchestrator(linking, target);
        else uiStore.getState().setLinking(null);
      }}
    >
      {rect && (
        <div
          className="pointer-events-none fixed rounded-xl border-2 border-dashed border-ov-accent/80 bg-ov-accent/5"
          style={clientRectOf(rect, view)}
        />
      )}
      <div className="pointer-events-none fixed left-1/2 top-16 -translate-x-1/2 rounded-full border border-ov-line bg-ov-surface-2 px-3 py-1 text-xs text-ov-text-2 shadow-ov">
        Clique sur un groupe ou un agent à relier · Échap pour terminer
      </div>
    </div>
  );
}
