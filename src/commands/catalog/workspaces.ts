import { removeWorkspace } from "@/shell/workspaceActions";
import { nodesStore } from "@/store/nodes";
import { countRunning } from "@/store/running";
import { terminalStatusStore } from "@/store/terminalStatus";
import { workspacesStore } from "@/store/workspaces";
import type { Command } from "../command";
import { requestUi } from "../uiRequests";
import { command, sectionNamed } from "./define";
import { inProject } from "./navigation";

const section = sectionNamed((s) => s.workspaces);

const onScreen = () => {
  const { workspaces, activeId } = workspacesStore.getState();
  return workspaces.find((w) => w.id === activeId);
};

export const WORKSPACES: readonly Command[] = [
  command("workspace.new", {
    section,
    available: inProject,
    run: async () => {
      await workspacesStore.getState().create();
    },
  }),
  command("workspace.rename", {
    section,
    available: inProject,
    run: (ctx) => {
      if (ctx.workspaceId) requestUi({ kind: "renameWorkspace", id: ctx.workspaceId });
    },
  }),
  command("workspace.delete", {
    section,
    // Never the last one (spec fenêtre §7.3), like the tab's ×.
    available: (ctx) => ctx.project && workspacesStore.getState().workspaces.length > 1,
    run: async () => {
      const workspace = onScreen();
      if (!workspace) return;
      const running = countRunning(nodesStore.getState().nodes, terminalStatusStore.getState().statuses, [workspace.id]);
      await removeWorkspace(workspace, running);
    },
  }),
];
