import { useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { forgetScene } from "@/canvas/sceneCache";
import { flushAll } from "@/lib/flush";
import { cn } from "@/lib/utils";
import { disposeTerminal } from "@/nodes/terminal/registry";
import { nodesStore, useNodes } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { useWorkspaces, workspacesStore, type Workspace } from "@/store/workspaces";

const fail = (what: string) => (error: unknown) => toast.error(`${what} : ${String(error)}`);

export function WorkspaceSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  const { create, select } = workspacesStore.getState();

  if (collapsed) {
    return (
      <aside className="flex w-10 flex-col items-center border-r bg-sidebar py-2">
        <Button size="icon" variant="ghost" aria-label="Afficher les workspaces" onClick={() => setCollapsed(false)}>
          <PanelLeftOpen />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <header className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold">Workspaces</span>
        <div className="flex">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Nouveau workspace"
            onClick={() => void create().catch(fail("Création impossible"))}
          >
            <Plus />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Masquer" onClick={() => setCollapsed(true)}>
            <PanelLeftClose />
          </Button>
        </div>
      </header>
      <nav className="flex flex-col gap-0.5 px-2">
        {workspaces.map((workspace) => (
          <WorkspaceRow
            key={workspace.id}
            workspace={workspace}
            active={workspace.id === activeId}
            canRemove={workspaces.length > 1}
            onSelect={() => select(workspace.id)}
          />
        ))}
      </nav>
    </aside>
  );
}

/** Deletes a workspace after confirmation, stopping its terminals (spec §8.5). */
async function removeWorkspace(workspace: Workspace) {
  const confirmed = await ask(`Supprimer « ${workspace.name} » ? Ses terminaux seront arrêtés et son contenu effacé.`, {
    title: "Supprimer le workspace",
    kind: "warning",
    okLabel: "Supprimer",
    cancelLabel: "Annuler",
  });
  if (!confirmed) return;
  // Pending saves are written first: once the row is gone they would fail.
  await flushAll();
  await workspacesStore.getState().remove(workspace.id);
  nodesStore.getState().forgetWorkspace(workspace.id).forEach(disposeTerminal);
  forgetScene(workspace.id);
}

function WorkspaceRow(props: { workspace: Workspace; active: boolean; canRemove: boolean; onSelect: () => void }) {
  const { workspace, active, canRemove, onSelect } = props;
  const [editing, setEditing] = useState(false);
  const running = useRunningCount(workspace.id);

  if (editing) {
    return (
      <Input
        autoFocus
        defaultValue={workspace.name}
        className="h-8"
        onBlur={(e) => {
          void workspacesStore.getState().rename(workspace.id, e.currentTarget.value).catch(fail("Renommage impossible"));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex h-8 items-center rounded-md pl-2 text-sm hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium",
      )}
    >
      <button className="flex-1 truncate text-left" onClick={onSelect} onDoubleClick={() => setEditing(true)}>
        {workspace.name}
      </button>
      {running > 0 && (
        <span
          className="mr-1 rounded-full bg-green-600/20 px-1.5 text-xs text-green-400"
          title={`${running} terminal(aux) actif(s)`}
        >
          {running}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-7 opacity-0 group-hover:opacity-100" aria-label="Actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setEditing(true)}>Renommer</DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canRemove}
            variant="destructive"
            onSelect={() => void removeWorkspace(workspace).catch(fail("Suppression impossible"))}
          >
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Terminals of this workspace whose process is running (badge, spec §6.1). */
function useRunningCount(workspaceId: string): number {
  const nodes = useNodes((s) => s.nodes);
  const statuses = useStore(terminalStatusStore, (s) => s.statuses);
  return Object.entries(nodes).filter(([id, node]) => node.workspaceId === workspaceId && statuses[id]?.state === "running")
    .length;
}
