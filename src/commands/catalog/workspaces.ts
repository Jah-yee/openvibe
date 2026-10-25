import { removeWorkspace } from "@/shell/workspaceActions";
import { nodesStore } from "@/store/nodes";
import { countRunning } from "@/store/running";
import { terminalStatusStore } from "@/store/terminalStatus";
import { workspacesStore } from "@/store/workspaces";
import type { Command } from "../command";
import { requestUi } from "../uiRequests";
import { inProject } from "./navigation";

const onScreen = () => {
  const { workspaces, activeId } = workspacesStore.getState();
  return workspaces.find((w) => w.id === activeId);
};

export const WORKSPACES: readonly Command[] = [
  {
    id: "workspace.new",
    label: "Nouveau workspace",
    section: "Workspaces",
    keywords: ["onglet", "nouveau", "workspace"],
    available: inProject,
    run: async () => {
      await workspacesStore.getState().create();
    },
  },
  {
    id: "workspace.rename",
    label: "Renommer le workspace",
    section: "Workspaces",
    keywords: ["onglet", "nom", "workspace"],
    available: inProject,
    run: (ctx) => {
      if (ctx.workspaceId) requestUi({ kind: "renameWorkspace", id: ctx.workspaceId });
    },
  },
  {
    id: "workspace.delete",
    label: "Supprimer le workspace",
    section: "Workspaces",
    keywords: ["onglet", "supprimer", "workspace"],
    // Never the last one (spec fenêtre §7.3), like the tab's ×.
    available: (ctx) => ctx.project && workspacesStore.getState().workspaces.length > 1,
    run: async () => {
      const workspace = onScreen();
      if (!workspace) return;
      const running = countRunning(nodesStore.getState().nodes, terminalStatusStore.getState().statuses, [workspace.id]);
      await removeWorkspace(workspace, running);
    },
  },
];
