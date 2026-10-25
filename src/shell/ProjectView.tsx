import { useEffect } from "react";
import { Canvas } from "@/canvas/Canvas";
import { AgentsPanel } from "@/fleet/AgentsPanel";
import { useAgentsPanel } from "@/fleet/agentsPanelState";
import { agentsStore } from "@/fleet/agentsStore";
import { LinkMode } from "@/fleet/LinkMode";
import { PlacementGhost } from "@/fleet/PlacementGhost";
import { useWorkspaces } from "@/store/workspaces";
import { ActivityRail } from "./ActivityRail";
import { AgentCounts } from "./AgentCounts";
import { CloseAgentDialog } from "./CloseAgentDialog";
import { CloseGroupDialog } from "./CloseGroupDialog";
import { CommandBar, CommandHint } from "./CommandBar";
import { GitChip } from "./GitChip";
import { ProjectPicker } from "./ProjectPicker";
import { TitleBar } from "./TitleBar";
import { ToolRail } from "./ToolRail";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { ZoomControl } from "./ZoomControl";

/**
 * The open project (spec identité §5): the canvas fills the window, under the
 * glass bars; everything else floats on it.
 */
export function ProjectView() {
  const status = useWorkspaces((s) => s.status);
  const error = useWorkspaces((s) => s.error);
  const activeId = useWorkspaces((s) => s.activeId);
  const panelOpen = useAgentsPanel((s) => s.open);

  useEffect(() => {
    void agentsStore.getState().load();
  }, []);

  return (
    <div className="ov-ambient relative h-screen w-screen overflow-hidden">
      {status === "ready" && activeId ? (
        <>
          <Canvas key={activeId} workspaceId={activeId} />
          <ToolRail />
          <ActivityRail />
          {panelOpen && <AgentsPanel />}
          <div className="absolute bottom-[14px] left-3 z-30">
            <GitChip />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[14px] z-30 flex flex-col items-center gap-2">
            <CommandHint />
            <CommandBar />
          </div>
          <div className="absolute bottom-[14px] right-3 z-30">
            <ZoomControl />
          </div>
          <PlacementGhost />
          <LinkMode />
        </>
      ) : (
        <div className="grid h-full place-items-center text-sm text-ov-text-2">
          {status === "error" ? `Impossible de charger les workspaces : ${error}` : "Chargement…"}
        </div>
      )}
      <div className="absolute inset-x-0 top-0 z-30">
        <TitleBar leading={<ProjectPicker />} trailing={<AgentCounts />} />
        <WorkspaceTabs />
      </div>
      <CloseAgentDialog />
      <CloseGroupDialog />
    </div>
  );
}
