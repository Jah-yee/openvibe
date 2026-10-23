import { memo } from "react";
import type { NonDeleted, ExcalidrawEmbeddableElement } from "@excalidraw/excalidraw/element/types";
import { nodeKindOf } from "@/canvas/nodeElement";

/** Renders the OpenVibe node behind an Excalidraw embeddable, chosen by its kind. */
export const NodeHost = memo(function NodeHost({ element }: { element: NonDeleted<ExcalidrawEmbeddableElement> }) {
  const kind = nodeKindOf(element);
  return (
    <div className="grid h-full place-items-center rounded-md border bg-card text-sm text-muted-foreground">
      {kind ? `Nœud ${kind} (à venir)` : "Nœud inconnu"}
    </div>
  );
}, (prev, next) => prev.element.id === next.element.id);
