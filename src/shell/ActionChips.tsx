import { toast } from "sonner";
import { canvasStore } from "@/canvas/canvasStore";
import { nextGroupName } from "@/canvas/groups";
import { agentsStore } from "@/fleet/agentsStore";
import { defaultAgent } from "@/fleet/catalog";
import { ComposeGroup } from "@/fleet/ComposeGroup";
import { launchGroup } from "@/fleet/groups";
import { defaultLaunchOptions, launchAgent } from "@/fleet/launchAgent";
import { viewportCenter } from "@/fleet/placement";
import { ChipButton } from "./ui";

const reportLaunchError = (error: unknown) => toast.error(`Lancement impossible : ${String(error)}`);

/** Chips above the command bar (spec habillage §5.6); J5 adds pause and resume. */
export function ActionChips() {
  const newConsole = () => {
    const agent = defaultAgent(agentsStore.getState().agents);
    const center = viewportCenter(canvasStore.getState().view);
    void launchAgent(agent, defaultLaunchOptions(), center).catch(reportLaunchError);
  };
  const launchFour = () => {
    const agent = defaultAgent(agentsStore.getState().agents);
    const name = nextGroupName(canvasStore.getState().frames);
    void launchGroup({ name, role: "general", agents: [agent, agent, agent, agent] }).catch(reportLaunchError);
  };
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <ChipButton onClick={newConsole}>Nouvelle console</ChipButton>
      <ChipButton onClick={launchFour}>Lancer 4</ChipButton>
      <ComposeGroup />
    </div>
  );
}
