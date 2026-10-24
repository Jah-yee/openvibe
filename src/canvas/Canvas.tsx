import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { toast } from "sonner";
import { assignMissingNames } from "@/fleet/naming";
import { dismissResumeOffer, offerResumeAll } from "@/fleet/ResumeAllToast";
import { adoptCopies } from "@/fleet/terminals";
import { saveFiles, saveScene } from "@/ipc/db";
import { onFlushAll } from "@/lib/flush";
import { NodeHost } from "@/nodes/NodeHost";
import { disposeTerminal, focusTerminal } from "@/nodes/terminal/registry";
import { nodesStore } from "@/store/nodes";
import { createActivationTracker } from "./activation";
import { canvasStore, fullSizeView, viewFrom } from "./canvasStore";
import { framesFromScene } from "./groups";
import { isOpenVibeLink } from "./nodeElement";
import { classifyAddedNodes } from "./nodeCopies";
import { DotGrid } from "./overlay/DotGrid";
import { GroupBackdrops } from "./overlay/GroupBackdrops";
import { GroupLabels } from "./overlay/GroupLabels";
import { loadScene, rememberScene, type LoadedScene } from "./sceneCache";
import { EXCALIDRAW_UI_OPTIONS, withSceneDefaults } from "./sceneDefaults";
import { createSceneSync, liveNodeIds } from "./sceneSync";

const reportSaveError = (error: unknown) => toast.error(`Sauvegarde impossible : ${String(error)}`);

/** One Excalidraw instance per workspace; remounted (via `key`) when switching. */
export function Canvas({ workspaceId }: { workspaceId: string }) {
  const [scene, setScene] = useState<LoadedScene | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadScene(workspaceId).then(
      (loaded) => alive && setScene(loaded),
      (failure: unknown) => alive && setError(String(failure)),
    );
    return () => {
      alive = false;
    };
  }, [workspaceId]);

  if (error) return <Centered>Impossible de charger ce workspace : {error}</Centered>;
  if (!scene) return <Centered>Chargement…</Centered>;
  return <LoadedCanvas workspaceId={workspaceId} scene={scene} />;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 grid place-items-center text-sm text-ov-text-2">{children}</div>;
}

function LoadedCanvas({ workspaceId, scene }: { workspaceId: string; scene: LoadedScene }) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const initialData = useMemo(() => withSceneDefaults(scene.initialData), [scene]);

  // The shell (rails, zoom, panels) drives the Excalidraw instance on screen.
  useEffect(() => {
    canvasStore.getState().setApi(api);
    return () => {
      if (canvasStore.getState().api === api) canvasStore.getState().setApi(null);
    };
  }, [api]);

  // The next workspace must not show this one's groups before its first change.
  useEffect(
    () => () => {
      canvasStore.getState().setFrames([]);
      canvasStore.getState().setNodeIds([]);
    },
    [],
  );

  const sync = useMemo(
    () =>
      createSceneSync(
        { elements: scene.initialData.elements ?? [], savedFileIds: scene.savedFileIds },
        {
          saveScene: (elementsJson, appStateJson, nodeIds) => saveScene(workspaceId, elementsJson, appStateJson, nodeIds),
          saveFiles: (files) => saveFiles(workspaceId, files),
          onSceneChanged: (elements, appState, files, savedFileIds) =>
            rememberScene(workspaceId, elements, appState, files, savedFileIds),
          // An undo can bring back a node whose row the last scene save purged.
          onNodesAdded: (ids) => {
            const elements = canvasStore.getState().api?.getSceneElementsIncludingDeleted() ?? [];
            const added = classifyAddedNodes(ids, elements, (id) => id in nodesStore.getState().nodes);
            // An undo can bring back a node whose row the last scene save purged.
            added.restored.forEach((id) => void nodesStore.getState().persist(id).catch(reportSaveError));
            if (added.copies.length) void adoptCopies(workspaceId, added.copies).catch(reportSaveError);
          },
          onNodesRemoved: (ids) => ids.forEach(disposeTerminal),
        },
      ),
    [workspaceId, scene],
  );

  useEffect(() => {
    const unregister = onFlushAll(() => sync.flush());
    return () => {
      unregister();
      void sync.flush()?.catch(reportSaveError);
    };
  }, [sync]);

  // Terminals saved before plan A have no name yet (spec habillage §9.2).
  useEffect(() => {
    void assignMissingNames(workspaceId, liveNodeIds(scene.initialData.elements ?? [])).catch(reportSaveError);
  }, [workspaceId, scene]);

  // After the scene is shown, restored terminals have their status.
  useEffect(() => {
    const timer = setTimeout(() => offerResumeAll(workspaceId), 800);
    return () => {
      clearTimeout(timer);
      dismissResumeOffer(workspaceId);
    };
  }, [workspaceId]);

  const trackActivation = useMemo(() => createActivationTracker(), []);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      sync.onChange(elements, appState, files, getSceneVersion(elements));
      canvasStore.getState().setView(viewFrom(appState));
      canvasStore.getState().setFrames(framesFromScene(elements));
      canvasStore.getState().setNodeIds(liveNodeIds(elements));
      const activated = trackActivation(appState.activeEmbeddable);
      // Deferred: changing the view from inside onChange would re-enter it.
      if (activated && api) requestAnimationFrame(() => showAtFullSize(api, activated));
    },
    [sync, trackActivation, api],
  );

  return (
    <div className="absolute inset-0">
      <DotGrid />
      <GroupBackdrops />
      <GroupLabels />
      <div className="absolute inset-0">
        <Excalidraw
          theme="dark"
          langCode="fr-FR"
          excalidrawAPI={setApi}
          initialData={initialData}
          onChange={onChange}
          UIOptions={EXCALIDRAW_UI_OPTIONS}
          validateEmbeddable={isOpenVibeLink}
          renderEmbeddable={(element) => <NodeHost element={element} />}
        />
      </div>
    </div>
  );
}

/**
 * Spec §6.3: an activated terminal is shown at 100 %, where xterm text is sharp
 * and mouse selection lines up; the view is only moved when it was zoomed.
 */
function showAtFullSize(api: ExcalidrawImperativeAPI, nodeId: string) {
  focusTerminal(nodeId);
  if (api.getAppState().zoom.value === 1) return;
  const element = api.getSceneElements().find((e) => e.id === nodeId);
  if (!element) return;
  api.updateScene({ appState: fullSizeView(element, api.getAppState()) });
}
