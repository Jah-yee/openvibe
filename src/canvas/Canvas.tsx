import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CaptureUpdateAction, Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
} from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { toast } from "sonner";
import { saveFiles, saveScene } from "@/ipc/db";
import { onFlushAll } from "@/lib/flush";
import { NodeHost } from "@/nodes/NodeHost";
import { LaunchDialog } from "@/nodes/terminal/LaunchDialog";
import { disposeTerminal, focusTerminal, markForAutostart } from "@/nodes/terminal/registry";
import type { TerminalPayload } from "@/nodes/types";
import { nodesStore } from "@/store/nodes";
import { uiStore, useUi } from "@/store/ui";
import { createActivationTracker } from "./activation";
import { canvasStore, viewFrom } from "./canvasStore";
import { createNodeElement, isOpenVibeLink } from "./nodeElement";
import { DotGrid } from "./overlay/DotGrid";
import { loadScene, rememberScene, type LoadedScene } from "./sceneCache";
import { EXCALIDRAW_UI_OPTIONS, withSceneDefaults } from "./sceneDefaults";
import { createSceneSync } from "./sceneSync";

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
  const launchOpen = useUi((s) => s.launchOpen);
  const initialData = useMemo(() => withSceneDefaults(scene.initialData), [scene]);

  // The shell (rails, zoom, panels) drives the Excalidraw instance on screen.
  useEffect(() => {
    canvasStore.getState().setApi(api);
    return () => {
      if (canvasStore.getState().api === api) canvasStore.getState().setApi(null);
    };
  }, [api]);

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
          onNodesAdded: (ids) => ids.forEach((id) => void nodesStore.getState().persist(id).catch(reportSaveError)),
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

  const trackActivation = useMemo(() => createActivationTracker(), []);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      sync.onChange(elements, appState, files, getSceneVersion(elements));
      canvasStore.getState().setView(viewFrom(appState));
      const activated = trackActivation(appState.activeEmbeddable);
      // Deferred: changing the view from inside onChange would re-enter it.
      if (activated && api) requestAnimationFrame(() => showAtFullSize(api, activated));
    },
    [sync, trackActivation, api],
  );

  const launch = useCallback(
    async (payload: TerminalPayload) => {
      if (!api) return;
      const { scrollX, scrollY, zoom, width, height } = api.getAppState();
      const center = { x: width / 2 / zoom.value - scrollX, y: height / 2 / zoom.value - scrollY };
      const element = createNodeElement("terminal", center);
      try {
        // The node row must exist before the process can save its scrollback.
        await nodesStore.getState().create(element.id, { workspaceId, kind: "terminal", payload });
      } catch (error) {
        reportSaveError(error);
        return;
      }
      markForAutostart(element.id);
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), element],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    [api, workspaceId],
  );

  return (
    <div className="absolute inset-0">
      <DotGrid />
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
      <LaunchDialog
        open={launchOpen}
        onOpenChange={uiStore.getState().setLaunchOpen}
        onLaunch={(payload) => void launch(payload)}
      />
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
  api.updateScene({ appState: { zoom: { value: 1 as NormalizedZoomValue } } });
  api.scrollToContent(element, { animate: true, duration: 200 });
}
