import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { boot } from "@/app/boot";
import { HomeScreen } from "@/home/HomeScreen";
import { DragStrip } from "@/shell/DragStrip";
import { ProjectView } from "@/shell/ProjectView";
import { WindowCorner } from "@/shell/WindowControls";
import { useProjects } from "@/store/projects";

export default function App() {
  const view = useProjects((s) => s.view);
  const error = useProjects((s) => s.error);

  useEffect(() => {
    void boot();
  }, []);

  return (
    <>
      {view === "home" && <HomeScreen />}
      {view === "project" && <ProjectView />}
      {(view === "loading" || view === "error") && (
        <div className="grid h-screen place-items-center bg-ov-canvas text-sm text-ov-text-2">
          {view === "error" ? `Impossible de charger les projets : ${error}` : "Chargement…"}
        </div>
      )}
      <DragStrip />
      {view !== "project" && <WindowCorner />}
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
