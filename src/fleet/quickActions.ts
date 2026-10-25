import { toast } from "sonner";
import { canvasStore } from "@/canvas/canvasStore";
import { nextGroupName } from "@/canvas/groups";
import type { AgentId } from "@/ipc/pty";
import { workspacesStore } from "@/store/workspaces";
import { agentsStore } from "./agentsStore";
import { defaultAgent } from "./catalog";
import { launchGroup } from "./groups";
import { defaultLaunchOptions, launchAgent } from "./launchAgent";
import { addOrchestrator } from "./orchestrators";
import { viewportCenter } from "./placement";

const reportLaunchError = (error: unknown) => toast.error(`Lancement impossible : ${String(error)}`);

/** An agent at the center of the view, in the group under it if any, with the default options (spec habillage §11.3, spec fenêtre §7.3). */
export function launchAt(agent: AgentId) {
  const center = viewportCenter(canvasStore.getState().view);
  void launchAgent(agent, defaultLaunchOptions(), center).catch(reportLaunchError);
}

/** "Nouvelle console": the default agent at the center of the view (spec habillage §5.6). */
export function newConsole() {
  launchAt(defaultAgent(agentsStore.getState().agents));
}

/** "Lancer 4 agents": a Général group of four default agents (spec habillage §11.3). */
export function launchFour() {
  const agent = defaultAgent(agentsStore.getState().agents);
  const name = nextGroupName(canvasStore.getState().frames);
  void launchGroup({ name, role: "general", agents: [agent, agent, agent, agent] }).catch(reportLaunchError);
}

/** « Orchestrateur » of the palette: at the center of the view, like a launch (plan F2, décision 3). */
export function placeOrchestrator() {
  const workspaceId = workspacesStore.getState().activeId;
  if (!workspaceId) return;
  void addOrchestrator(workspaceId, viewportCenter(canvasStore.getState().view)).catch(reportLaunchError);
}
