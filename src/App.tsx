import { Toaster } from "@/components/ui/sonner";
import { Canvas } from "@/canvas/Canvas";
import { WorkspaceSidebar } from "@/sidebar/WorkspaceSidebar";
import { useWorkspaces } from "@/store/workspaces";

export default function App() {
  const activeId = useWorkspaces((s) => s.activeId);
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <WorkspaceSidebar />
      <main className="min-w-0 flex-1">
        <Canvas key={activeId} workspaceId={activeId} />
      </main>
      <Toaster theme="dark" />
    </div>
  );
}
