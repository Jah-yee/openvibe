import { Check, ChevronDown, Folder } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectsStore, useProjects } from "@/store/projects";

/** "mk-webapp ⌄" in the title bar: recent projects, the home screen, closing the project (spec identité §5.1). */
export function ProjectPicker() {
  const projects = useProjects((s) => s.projects);
  const activeId = useProjects((s) => s.activeId);
  const active = projects.find((p) => p.id === activeId);
  const recent = [...projects].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-[26px] items-center gap-1 rounded-[6px] px-2 text-[13px] font-semibold text-ov-text hover:bg-ov-hover"
        >
          <span className="max-w-48 truncate">{active?.name ?? "Projet"}</span>
          <ChevronDown className="size-3.5 text-ov-text-2" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {recent.map((project) => (
          <DropdownMenuItem
            key={project.id}
            disabled={project.missing}
            onSelect={() => void projectsStore.getState().open(project.id)}
          >
            <Folder />
            <span className="truncate">{project.name}</span>
            {project.id === activeId && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => projectsStore.getState().goHome()}>Tous les projets…</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void projectsStore.getState().close()}>Fermer le projet</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
