import { useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { Plus, X } from "lucide-react";
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
      {/* The whole tab selects, padding and badge included, like a browser tab. */}
      <button
        type="button"
        className="flex items-center self-stretch"
        onClick={() => workspacesStore.getState().select(workspace.id)}
        onDoubleClick={() => setEditing(true)}
      >
        <span className="max-w-40 truncate">{workspace.name}</span>
        {(active || running > 0) && (
          <span
            data-badge
            title={plural(running, "agent actif", "agents actifs")}
            className={cn(
              "ml-2 rounded-full px-1.5 font-mono text-[10px]",
              active ? "bg-ov-accent-soft text-ov-accent" : "bg-ov-field text-ov-text-2",
            )}
          >
            {running}
          </span>
        )}
      </button>
      {canRemove && (
        <button
          type="button"
          aria-label="Supprimer le workspace"
          title="Supprimer le workspace"
          onClick={() => void removeWorkspace(workspace, running).catch(fail("Suppression impossible"))}
          className="ml-1 grid size-5 place-items-center rounded-[4px] text-ov-text-2 opacity-0 group-hover:opacity-100 hover:bg-ov-hover hover:text-ov-text focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
      {/* The context menu (right click) anchors on the tab itself. */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <span aria-hidden className="pointer-events-none absolute inset-0" />
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

/**
 * Workspace tabs of the open project, then "+", then the empty space that
 * moves the window (spec identité §5.2). The row scrolls sideways, by the
 * wheel, without a scrollbar: it must not drag itself, or a press on it would
 * move the window instead of scrolling.
 */
export function WorkspaceTabs() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  return (
    <div
      onWheel={(e) => {
        if (e.deltaX === 0) e.currentTarget.scrollLeft += e.deltaY;
      }}
      className="ov-glass-strong flex w-full items-end gap-0.5 overflow-x-auto overflow-y-hidden rounded-none border-x-0 border-t-0 px-2.5 [scrollbar-width:none]"
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
      <div data-tauri-drag-region="" className="h-full min-w-6 flex-1" />
    </div>
  );
}
