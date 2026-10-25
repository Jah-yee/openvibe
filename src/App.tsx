import { useEffect } from "react";
import { boot } from "@/app/boot";
import { HomeScreen } from "@/home/HomeScreen";
import { AppToaster } from "@/shell/AppToaster";
import { ProjectView } from "@/shell/ProjectView";
import { StatusScreen } from "@/shell/StatusScreen";
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
      {view === "loading" && <StatusScreen message="Chargement…" />}
      {view === "error" && <StatusScreen message={`Impossible de charger les projets : ${error}`} />}
      <AppToaster />
    </>
  );
}
