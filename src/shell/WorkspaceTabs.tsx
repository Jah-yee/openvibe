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
import { PillButton } from "./ui";

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
        className="h-8 w-40 rounded-full"
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
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
      className={cn(
        "group flex h-8 shrink-0 items-center rounded-full border pl-3 pr-1 text-[13px] font-medium shadow-ov",
        active
          ? "border-ov-accent bg-ov-accent-soft text-ov-text"
          : "border-ov-line bg-ov-surface text-ov-text-2 hover:text-ov-text",
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
            active ? "bg-ov-accent text-white" : "bg-ov-card text-ov-text-2",
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
            className="ml-0.5 grid size-6 place-items-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-ov-card data-[state=open]:opacity-100"
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

/** Workspace tabs of the open project, then "+" (spec habillage §5.2). */
export function WorkspaceTabs() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
      {workspaces.map((workspace) => (
        <WorkspaceTab
          key={workspace.id}
          workspace={workspace}
          active={workspace.id === activeId}
          canRemove={workspaces.length > 1}
        />
      ))}
      <PillButton
        aria-label="Nouveau workspace"
        title="Nouveau workspace"
        className="w-8 justify-center px-0"
        onClick={() => void workspacesStore.getState().create().catch(fail("Création impossible"))}
      >
        <Plus />
      </PillButton>
    </div>
  );
}
