import { Canvas } from "@/canvas/Canvas";
import { WorkspaceSidebar } from "@/sidebar/WorkspaceSidebar";
import { useWorkspaces } from "@/store/workspaces";
import { LeftRail } from "./LeftRail";
import { ZoomControl } from "./ZoomControl";

export function ProjectView() {
  const status = useWorkspaces((s) => s.status);
  const error = useWorkspaces((s) => s.error);
  const activeId = useWorkspaces((s) => s.activeId);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <WorkspaceSidebar />
      <main className="relative min-w-0 flex-1">
        {status === "ready" && activeId ? (
          <>
            <Canvas key={activeId} workspaceId={activeId} />
            <LeftRail />
            <div className="pointer-events-none absolute bottom-4 right-4 z-30">
              <ZoomControl />
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center text-sm text-ov-text-2">
            {status === "error" ? `Impossible de charger les workspaces : ${error}` : "Chargement…"}
          </div>
        )}
      </main>
    </div>
  );
}
