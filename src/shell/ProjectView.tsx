import { useEffect } from "react";
import { Canvas } from "@/canvas/Canvas";
import { AgentMenu } from "@/fleet/AgentMenu";
import { agentsStore } from "@/fleet/agentsStore";
import { PlacementGhost } from "@/fleet/PlacementGhost";
import { useWorkspaces } from "@/store/workspaces";
import { ActionChips } from "./ActionChips";
import { CloseAgentDialog } from "./CloseAgentDialog";
import { CloseGroupDialog } from "./CloseGroupDialog";
import { GitChip } from "./GitChip";
import { LeftRail } from "./LeftRail";
import { TopBar } from "./TopBar";
import { ZoomControl } from "./ZoomControl";

/** The open project: the canvas under the floating shell (spec habillage §5). */
export function ProjectView() {
  const status = useWorkspaces((s) => s.status);
  const error = useWorkspaces((s) => s.error);
  const activeId = useWorkspaces((s) => s.activeId);

  useEffect(() => {
    void agentsStore.getState().load();
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ov-canvas">
      {status === "ready" && activeId ? (
        <>
          <Canvas key={activeId} workspaceId={activeId} />
          <LeftRail agentButton={<AgentMenu />} />
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
            <div className="justify-self-start">
              <GitChip />
            </div>
            <ActionChips />
            <div className="justify-self-end">
              <ZoomControl />
            </div>
          </div>
          <PlacementGhost />
        </>
      ) : (
        <div className="grid h-full place-items-center text-sm text-ov-text-2">
          {status === "error" ? `Impossible de charger les workspaces : ${error}` : "Chargement…"}
        </div>
      )}
      <TopBar />
      <CloseAgentDialog />
      <CloseGroupDialog />
    </div>
  );
}
