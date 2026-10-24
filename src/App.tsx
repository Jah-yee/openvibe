import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { boot } from "@/app/boot";
import { Canvas } from "@/canvas/Canvas";
import { LeftRail } from "@/shell/LeftRail";
import { ZoomControl } from "@/shell/ZoomControl";
import { WorkspaceSidebar } from "@/sidebar/WorkspaceSidebar";
import { useWorkspaces } from "@/store/workspaces";

export default function App() {
  const status = useWorkspaces((s) => s.status);
  const error = useWorkspaces((s) => s.error);
  const activeId = useWorkspaces((s) => s.activeId);

  useEffect(() => {
    void boot();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {status === "ready" && activeId ? (
        <>
          <WorkspaceSidebar />
          <main className="relative min-w-0 flex-1">
            <Canvas key={activeId} workspaceId={activeId} />
            <LeftRail />
            <div className="pointer-events-none absolute bottom-4 right-4 z-30">
              <ZoomControl />
            </div>
          </main>
        </>
      ) : (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          {status === "error" ? `Impossible de charger les workspaces : ${error}` : "Chargement…"}
        </div>
      )}
      <Toaster theme="dark" />
    </div>
  );
}
