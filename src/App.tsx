import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { boot } from "@/app/boot";
import { Canvas } from "@/canvas/Canvas";
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
          <main className="min-w-0 flex-1">
            <Canvas key={activeId} workspaceId={activeId} />
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
