import { ask } from "@tauri-apps/plugin-dialog";
import { forgetWorkspaces } from "@/app/forget";
import { flushAll } from "@/lib/flush";
import { plural } from "@/lib/format";
import { workspacesStore, type Workspace } from "@/store/workspaces";

/** Deletes a workspace after confirmation, stopping its terminals (spec V1 §8.5): the tab's × and the palette. */
export async function removeWorkspace(workspace: Workspace, running: number) {
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
