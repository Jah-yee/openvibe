import { useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { AccentButton } from "@/shell/buttons";
import { TitleBar } from "@/shell/TitleBar";
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

/** Projects as glass cards under the title bar; a click opens one on its last workspace (spec identité §5.9). */
export function HomeScreen() {
  const projects = useProjects((s) => s.projects);

  useEffect(() => {
    void projectsStore.getState().refresh();
  }, []);

  return (
    <div className="ov-ambient flex h-screen w-screen flex-col">
      <TitleBar leading={<span className="text-[13px] font-semibold text-ov-text">OpenVibe</span>} />
      {/* The scroller starts below the title bar: scrolled cards never slide under it. */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="relative mx-auto max-w-5xl px-8 pb-12 pt-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-ov-text">Projets</h1>
            <AccentButton onClick={() => void addProject()}>
              <FolderPlus /> Ajouter un projet
            </AccentButton>
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
