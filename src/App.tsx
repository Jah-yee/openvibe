import { useEffect } from "react";
import { boot } from "@/app/boot";
import { Palette } from "@/commands/Palette";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HomeScreen } from "@/home/HomeScreen";
import { AppToaster } from "@/shell/AppToaster";
import { ProjectView } from "@/shell/ProjectView";
import { StatusScreen } from "@/shell/StatusScreen";
import { UpdateDialog } from "@/shell/UpdateDialog";
import { projectsStore, useProjects } from "@/store/projects";

export default function App() {
  const view = useProjects((s) => s.view);
  const error = useProjects((s) => s.error);

  useEffect(() => {
    boot().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("start failed", error);
      projectsStore.setState({ view: "error", error: `démarrage interrompu (${message})` });
    });
  }, []);

  return (
    <>
      {view === "home" && <HomeScreen />}
      {view === "project" && <ProjectView />}
      {view === "loading" && <StatusScreen message="Chargement…" />}
      {view === "error" && <StatusScreen message={`Impossible de charger les projets : ${error}`} />}
      <ErrorBoundary scope="palette" fallback={() => null}>
        <Palette />
      </ErrorBoundary>
      <ErrorBoundary scope="update dialog" fallback={() => null}>
        <UpdateDialog />
      </ErrorBoundary>
      <AppToaster />
    </>
  );
}
