import { useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { Ellipsis, Plus } from "lucide-react";
import { toast } from "sonner";
import { forgetWorkspaces } from "@/app/forget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { flushAll } from "@/lib/flush";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRunningCount } from "@/store/running";
import { useWorkspaces, workspacesStore, type Workspace } from "@/store/workspaces";
import { IconButton } from "./buttons";
import { TABS_HEIGHT } from "./layout";

const fail = (what: string) => (error: unknown) => toast.error(`${what} : ${String(error)}`);

/** Deletes a workspace after confirmation, stopping its terminals (spec V1 §8.5). */
async function removeWorkspace(workspace: Workspace, running: number) {
  const consequence =
    running > 0
      ? `${plural(running, "agent sera arrêté", "agents seront arrêtés")} et son contenu effacé.`
      : "Son contenu sera effacé.";
  const confirmed = await ask(`Supprimer « ${workspace.name} » ? ${consequence}`, {
    title: "Supprimer le workspace",
    kind: "warning",
    okLabel: "Supprimer",
    cancelLabel: "Annuler",
  });
  if (!confirmed) return;
  // Pending saves are written first: once the row is gone they would fail.
  await flushAll();
  await workspacesStore.getState().remove(workspace.id);
  forgetWorkspaces([workspace.id]);
}

function WorkspaceTab(props: { workspace: Workspace; active: boolean; canRemove: boolean }) {
  const { workspace, active, canRemove } = props;
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const running = useRunningCount([workspace.id]);

  if (editing) {
    return (
      <Input
        autoFocus
        defaultValue={workspace.name}
        className="mb-0.5 h-[28px] w-40 rounded-[6px]"
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
      data-tab={workspace.id}
      data-active={active}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
      className={cn(
        "group relative top-px flex h-[30px] shrink-0 items-center rounded-t-[6px] border border-b-0 pl-3.5 pr-1 text-[12.5px]",
        active
          ? "border-ov-glass-line bg-ov-tab-on text-ov-text before:absolute before:inset-x-2.5 before:-top-px before:h-0.5 before:rounded-full before:bg-ov-accent"
          : "border-transparent text-ov-text-2 hover:bg-ov-hover hover:text-ov-text",
      )}
    >
      <button
        type="button"
        className="max-w-40 truncate"
        onClick={() => workspacesStore.getState().select(workspace.id)}
        onDoubleClick={() => setEditing(true)}
      >
        {workspace.name}
      </button>
      {(active || running > 0) && (
        <span
          title={plural(running, "agent actif", "agents actifs")}
          className={cn(
            "ml-2 rounded-full px-1.5 font-mono text-[10px]",
            active ? "bg-ov-accent-soft text-ov-accent" : "bg-ov-field text-ov-text-2",
          )}
        >
          {running}
        </span>
      )}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Actions du workspace"
            className="ml-1 grid size-5 place-items-center rounded-[4px] opacity-0 group-hover:opacity-100 hover:bg-ov-hover data-[state=open]:opacity-100"
          >
            <Ellipsis className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setEditing(true)}>Renommer</DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canRemove}
            variant="destructive"
            onSelect={() => void removeWorkspace(workspace, running).catch(fail("Suppression impossible"))}
          >
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Workspace tabs of the open project, then "+" (spec identité §5.2). The row's empty space moves the window. */
export function WorkspaceTabs() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  return (
    <div
      data-tauri-drag-region=""
      className="ov-glass-strong flex w-full items-end gap-0.5 overflow-x-auto overflow-y-hidden rounded-none border-x-0 border-t-0 px-2.5"
      style={{ height: TABS_HEIGHT }}
    >
      {workspaces.map((workspace) => (
        <WorkspaceTab
          key={workspace.id}
          workspace={workspace}
          active={workspace.id === activeId}
          canRemove={workspaces.length > 1}
        />
      ))}
      <IconButton
        label="Nouveau workspace"
        className="mb-0.5 size-[28px]"
        onClick={() => void workspacesStore.getState().create().catch(fail("Création impossible"))}
      >
        <Plus />
      </IconButton>
    </div>
  );
}
