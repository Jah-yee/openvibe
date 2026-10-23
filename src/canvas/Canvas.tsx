import { useCallback, useState } from "react";
import { CaptureUpdateAction, Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { NodeHost } from "@/nodes/NodeHost";
import { InsertMenu } from "./InsertMenu";
import { createNodeElement, isOpenVibeLink, type NodeKind } from "./nodeElement";

export function Canvas() {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);

  const insert = useCallback(
    (kind: NodeKind) => {
      if (!api) return;
      const { scrollX, scrollY, zoom, width, height } = api.getAppState();
      const center = { x: width / 2 / zoom.value - scrollX, y: height / 2 / zoom.value - scrollY };
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), createNodeElement(kind, center)],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    [api],
  );

  return (
    <div className="relative h-full w-full">
      <Excalidraw
        theme="dark"
        langCode="fr-FR"
        excalidrawAPI={setApi}
        validateEmbeddable={isOpenVibeLink}
        renderEmbeddable={(element) => <NodeHost element={element} />}
        renderTopRightUI={() => <InsertMenu onInsert={insert} />}
      />
    </div>
  );
}
