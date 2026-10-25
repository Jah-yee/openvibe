import { toast } from "sonner";
import { projectsStore } from "@/store/projects";
import { workspacesStore } from "@/store/workspaces";
import type { GoToItem } from "./goTo";
import { requestArrival } from "./pendingArrival";
import { reach } from "./reach";

/** Entrée on a line of « Aller à » (spec fenêtre §7.2). */
export function goTo(item: GoToItem) {
  const workspaces = workspacesStore.getState();
  switch (item.kind) {
    case "workspace":
      if (item.workspaceId) workspaces.select(item.workspaceId);
      return;
    case "project":
      if (item.projectId) {
        void projectsStore
          .getState()
          .open(item.projectId)
          .catch((error: unknown) => toast.error(`Ouverture impossible : ${String(error)}`));
      }
      return;
    default: {
      if (!item.workspaceId || !item.targetId) return;
      const target = { workspaceId: item.workspaceId, kind: item.kind, id: item.targetId, label: item.label };
      if (item.workspaceId !== workspaces.activeId) {
        requestArrival(target);
        workspaces.select(item.workspaceId);
        return;
      }
      if (!reach(target.kind, target.id)) toast.error(`${target.label} n'existe plus`);
    }
  }
}
