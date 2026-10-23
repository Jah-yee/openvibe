import { useState } from "react";
import { MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useWorkspaces, workspacesStore, type Workspace } from "@/store/workspaces";

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
          <Button size="icon" variant="ghost" aria-label="Nouveau workspace" onClick={() => create()}>
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

function WorkspaceRow(props: { workspace: Workspace; active: boolean; canRemove: boolean; onSelect: () => void }) {
  const { workspace, active, canRemove, onSelect } = props;
  const [editing, setEditing] = useState(false);
  const { rename, remove } = workspacesStore.getState();

  if (editing) {
    return (
      <Input
        autoFocus
        defaultValue={workspace.name}
        className="h-8"
        onBlur={(e) => {
          rename(workspace.id, e.currentTarget.value);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-7 opacity-0 group-hover:opacity-100" aria-label="Actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setEditing(true)}>Renommer</DropdownMenuItem>
          <DropdownMenuItem disabled={!canRemove} variant="destructive" onSelect={() => remove(workspace.id)}>
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
