import { useState } from "react";
import { ask, open } from "@tauri-apps/plugin-dialog";
import { Ellipsis, Folder } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatAgo, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { projectsStore, type Project } from "@/store/projects";

const fail = (what: string) => (error: unknown) => toast.error(`${what} : ${String(error)}`);

async function relocate(project: Project) {
  const picked = await open({ directory: true, defaultPath: project.path, title: "Nouveau dossier du projet" });
  if (typeof picked === "string") await projectsStore.getState().relocate(project.id, picked);
}

async function remove(project: Project) {
  const confirmed = await ask(
    `Retirer « ${project.name} » de la liste ? Ses workspaces seront supprimés et ses agents arrêtés. Le dossier n'est pas touché.`,
    { title: "Retirer le projet", kind: "warning", okLabel: "Retirer", cancelLabel: "Annuler" },
  );
  if (confirmed) await projectsStore.getState().remove(project.id);
}

/** A project of the home screen (spec habillage §5.1). */
export function ProjectCard({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const openable = !project.missing && !editing;
  const openProject = () => {
    if (openable) void projectsStore.getState().open(project.id).catch(fail("Ouverture impossible"));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openProject}
      onKeyDown={(e) => e.key === "Enter" && openProject()}
      className={cn(
        "ov-glass-strong group rounded-[14px] p-4 transition-colors",
        openable && "cursor-pointer hover:border-ov-accent/60",
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-ov-accent-soft text-ov-accent">
          <Folder className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input
              autoFocus
              defaultValue={project.name}
              className="h-7"
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                void projectsStore.getState().rename(project.id, e.currentTarget.value).catch(fail("Renommage impossible"));
                setEditing(false);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <p className="truncate font-semibold text-ov-text">{project.name}</p>
          )}
          <p className="truncate font-mono text-[11px] text-ov-text-2" title={project.path}>
            {project.path}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Actions du projet"
              onClick={(e) => e.stopPropagation()}
              className="grid size-7 place-items-center rounded-full text-ov-text-2 opacity-0 group-hover:opacity-100 hover:bg-ov-card hover:text-ov-text data-[state=open]:opacity-100"
            >
              <Ellipsis className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => setEditing(true)}>Renommer</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void relocate(project).catch(fail("Changement impossible"))}>
              Changer de dossier
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => void remove(project).catch(fail("Retrait impossible"))}>
              Retirer de la liste
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {project.missing ? (
        <p className="text-xs text-ov-danger">Dossier introuvable</p>
      ) : (
        <div className="flex items-center gap-3 font-mono text-[11px] text-ov-text-2">
          <span>{plural(project.workspaceCount, "workspace", "workspaces")}</span>
          {project.liveAgents > 0 && (
            <span className="flex items-center gap-1 text-ov-live">
              <span className="size-1.5 rounded-full bg-ov-live" />
              {plural(project.liveAgents, "agent actif", "agents actifs")}
            </span>
          )}
          <span className="ml-auto">{formatAgo(project.lastOpenedAt)}</span>
        </div>
      )}
    </div>
  );
}
