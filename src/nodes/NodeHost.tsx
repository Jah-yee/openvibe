import { memo } from "react";
import type { NonDeleted, ExcalidrawEmbeddableElement } from "@excalidraw/excalidraw/element/types";
import { nodeKindOf } from "@/canvas/nodeElement";
import { SpikeTerminal } from "@/spike/SpikeTerminal";

/** Renders the OpenVibe node behind an Excalidraw embeddable, chosen by its kind. */
export const NodeHost = memo(function NodeHost({ element }: { element: NonDeleted<ExcalidrawEmbeddableElement> }) {
  switch (nodeKindOf(element)) {
    case "terminal":
      return <SpikeTerminal nodeId={element.id} />;
    default:
      return <div className="grid h-full place-items-center bg-card text-muted-foreground">Nœud inconnu</div>;
  }
}, (prev, next) => prev.element.id === next.element.id);
