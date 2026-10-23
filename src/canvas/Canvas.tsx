import { useCallback, useMemo, useRef, useState } from "react";
import { CaptureUpdateAction, Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { NodeHost } from "@/nodes/NodeHost";
import { workspacesStore } from "@/store/workspaces";
import { SpikePanel } from "@/spike/SpikePanel";
import { InsertMenu } from "./InsertMenu";
import { createNodeElement, isOpenVibeLink, type NodeKind } from "./nodeElement";
import { createChangeDetector } from "./sceneChanges";

const sceneKey = (elements: readonly ExcalidrawElement[], appState: AppState) =>
  `${getSceneVersion(elements)}:${appState.scrollX}:${appState.scrollY}:${appState.zoom.value}`;

/** One Excalidraw instance per workspace; remounted (via `key`) when switching. */
export function Canvas({ workspaceId }: { workspaceId: string }) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialData = useMemo(() => workspacesStore.getState().scenes[workspaceId] ?? null, [workspaceId]);
  const hasChanged = useMemo(() => createChangeDetector(sceneKey), [workspaceId]);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (!hasChanged(elements, appState)) return;
      const { scrollX, scrollY, zoom } = appState;
      workspacesStore.getState().saveScene(workspaceId, { elements, appState: { scrollX, scrollY, zoom } });
    },
    [workspaceId, hasChanged],
  );

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
    <div ref={containerRef} className="relative h-full w-full">
      <Excalidraw
        theme="dark"
        langCode="fr-FR"
        excalidrawAPI={setApi}
        initialData={initialData}
        onChange={onChange}
        validateEmbeddable={isOpenVibeLink}
        renderEmbeddable={(element) => <NodeHost element={element} />}
        renderTopRightUI={() => <InsertMenu onInsert={insert} />}
      />
      {api && containerRef.current && <SpikePanel api={api} container={containerRef.current} />}
    </div>
  );
}
