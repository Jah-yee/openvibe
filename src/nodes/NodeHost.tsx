import { memo } from "react";
import type { NonDeleted, ExcalidrawEmbeddableElement } from "@excalidraw/excalidraw/element/types";
import { nodeKindOf } from "@/canvas/nodeElement";
import { OrchestratorNode } from "./orchestrator/OrchestratorNode";
import { TerminalNode } from "./terminal/TerminalNode";

/** Renders the OpenVibe node behind an Excalidraw embeddable, chosen by its kind. */
export const NodeHost = memo(function NodeHost({ element }: { element: NonDeleted<ExcalidrawEmbeddableElement> }) {
  switch (nodeKindOf(element)) {
    case "terminal":
      return <TerminalNode nodeId={element.id} />;
    case "orchestrator":
      return <OrchestratorNode nodeId={element.id} />;
    default:
      return <div className="grid h-full place-items-center rounded-md border bg-card text-muted-foreground">Nœud inconnu</div>;
  }
}, (prev, next) => prev.element.id === next.element.id);
