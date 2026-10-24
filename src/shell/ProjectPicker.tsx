import { Check, ChevronDown, Folder } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectsStore, useProjects } from "@/store/projects";
import { PillButton } from "./ui";

/** "▭ mk-webapp ⌄": recent projects, then the home screen. */
export function ProjectPicker() {
  const projects = useProjects((s) => s.projects);
  const activeId = useProjects((s) => s.activeId);
  const active = projects.find((p) => p.id === activeId);
  const recent = [...projects].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton>
          <Folder className="text-ov-text-2" />
          <span className="max-w-40 truncate">{active?.name ?? "Projet"}</span>
          <ChevronDown className="text-ov-text-2" />
        </PillButton>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
