import { useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { DotGridBackground } from "@/canvas/overlay/DotGrid";
import { dotGrid } from "@/canvas/overlay/grid";
import { TOP_ROW_HEIGHT } from "@/shell/layout";
import { PillButton } from "@/shell/ui";
import { projectsStore, useProjects } from "@/store/projects";
import { ProjectCard } from "./ProjectCard";

async function addProject() {
  const picked = await open({ directory: true, title: "Dossier du projet" });
  if (typeof picked !== "string") return;
  await projectsStore
    .getState()
    .add(picked)
    .catch((error: unknown) => toast.error(`Ajout impossible : ${String(error)}`));
}

/** Projects as cards; a click opens one on its last workspace (spec habillage §5.1). */
export function HomeScreen() {
  const projects = useProjects((s) => s.projects);

  useEffect(() => {
    void projectsStore.getState().refresh();
  }, []);

  return (
    <div className="ov-ambient relative h-screen w-screen">
      <DotGridBackground {...dotGrid({ scrollX: 0, scrollY: 0, zoom: 1 })} />
      {/* The scroller starts below the window's drag strip: scrolled cards never slide under it. */}
      <div className="absolute inset-x-0 bottom-0 overflow-auto" style={{ top: TOP_ROW_HEIGHT }}>
        <div className="relative mx-auto max-w-5xl px-8 pb-12 pt-2">
          <header className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="ov-orb size-8" aria-hidden />
              <h1 className="text-xl font-semibold text-ov-text">OpenVibe</h1>
            </div>
            <PillButton
              className="border-ov-accent bg-ov-accent text-white hover:bg-ov-accent/90"
              onClick={() => void addProject()}
            >
              <FolderPlus /> Ajouter un projet
            </PillButton>
          </header>
          {projects.length === 0 ? (
            <div className="mt-24 grid place-items-center gap-3 text-center">
              <p className="text-lg font-semibold text-ov-text">Aucun projet</p>
              <p className="max-w-sm text-sm text-ov-text-2">
                Un projet est un dossier de dépôt : tes agents y démarrent et la puce git le suit.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
