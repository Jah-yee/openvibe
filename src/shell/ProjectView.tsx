import { Canvas } from "@/canvas/Canvas";
import { useWorkspaces } from "@/store/workspaces";
import { CloseAgentDialog } from "./CloseAgentDialog";
import { GitChip } from "./GitChip";
import { LeftRail } from "./LeftRail";
import { TopBar } from "./TopBar";
import { ZoomControl } from "./ZoomControl";

/** The open project: the canvas under the floating shell (spec habillage §5). */
export function ProjectView() {
  const status = useWorkspaces((s) => s.status);
  const error = useWorkspaces((s) => s.error);
  const activeId = useWorkspaces((s) => s.activeId);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ov-canvas">
      {status === "ready" && activeId ? (
        <>
          <Canvas key={activeId} workspaceId={activeId} />
          <LeftRail />
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 flex items-end justify-between gap-4">
            <GitChip />
            <ZoomControl />
          </div>
        </>
      ) : (
        <div className="grid h-full place-items-center text-sm text-ov-text-2">
          {status === "error" ? `Impossible de charger les workspaces : ${error}` : "Chargement…"}
        </div>
      )}
      <TopBar />
      <CloseAgentDialog />
    </div>
  );
}
