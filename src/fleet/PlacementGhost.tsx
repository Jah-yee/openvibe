import { useEffect, useState } from "react";
import { toast } from "sonner";
import { canvasStore, useCanvas } from "@/canvas/canvasStore";
import { groupAt } from "@/canvas/groups";
import { uiStore, useUi } from "@/store/ui";
import { freeCell } from "./groupLayout";
import { launchAgent } from "./launchAgent";
import { clientRectOf, ghostRect, sceneOf } from "./placement";
import type { Point } from "./terminals";

/** Dashed outline that follows the pointer until a click places the agent (spec habillage §10.1). */
export function PlacementGhost() {
  const placing = useUi((s) => s.placing);
  const view = useCanvas((s) => s.view);
  const frames = useCanvas((s) => s.frames);
  const [pointer, setPointer] = useState<Point | null>(null);

  useEffect(() => {
    if (!placing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") uiStore.getState().setPlacing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placing]);

  if (!placing) return null;
  // Over a group the ghost shows the cell the agent will take (spec §10.1, §11.3).
  const group = pointer ? groupAt(frames, sceneOf(pointer, view)) : null;
  const members = group ? (canvasStore.getState().api?.getSceneElements().filter((e) => e.frameId === group.id) ?? []) : [];
  const rect = group ? clientRectOf(freeCell(group, members).cell, view) : pointer ? ghostRect(pointer, view.zoom) : null;

  return (
    <div
      className="fixed inset-0 z-40 cursor-crosshair"
      onPointerMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => {
        e.preventDefault();
        uiStore.getState().setPlacing(null);
      }}
      onClick={(e) => {
        uiStore.getState().setPlacing(null);
        const center = sceneOf({ x: e.clientX, y: e.clientY }, canvasStore.getState().view);
        void launchAgent(placing.agent, placing.options, center).catch((error: unknown) =>
          toast.error(`Lancement impossible : ${String(error)}`),
        );
      }}
    >
      {rect && (
        <div className="pointer-events-none fixed rounded-xl border-2 border-dashed border-ov-accent/80 bg-ov-accent/5" style={rect} />
      )}
      <div className="pointer-events-none fixed left-1/2 top-16 -translate-x-1/2 rounded-full border border-ov-line bg-ov-surface-2 px-3 py-1 text-xs text-ov-text-2 shadow-ov">
        {group ? `Clique pour l'ajouter au groupe ${group.name} · Échap pour annuler` : "Clique pour poser l'agent · Échap pour annuler"}
      </div>
    </div>
  );
}
