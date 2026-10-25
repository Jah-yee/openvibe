import { toast } from "sonner";
import { canvasStore } from "@/canvas/canvasStore";
import { nextGroupName } from "@/canvas/groups";
import { agentsStore } from "./agentsStore";
import { defaultAgent } from "./catalog";
import { launchGroup } from "./groups";
import { defaultLaunchOptions, launchAgent } from "./launchAgent";
import { viewportCenter } from "./placement";

const reportLaunchError = (error: unknown) => toast.error(`Lancement impossible : ${String(error)}`);

/** "Nouvelle console": the default agent at the center of the view (spec habillage §5.6). */
export function newConsole() {
  const agent = defaultAgent(agentsStore.getState().agents);
  const center = viewportCenter(canvasStore.getState().view);
  void launchAgent(agent, defaultLaunchOptions(), center).catch(reportLaunchError);
}

/** "Lancer 4 agents": a Général group of four default agents (spec habillage §11.3). */
export function launchFour() {
  const agent = defaultAgent(agentsStore.getState().agents);
  const name = nextGroupName(canvasStore.getState().frames);
  void launchGroup({ name, role: "general", agents: [agent, agent, agent, agent] }).catch(reportLaunchError);
}
