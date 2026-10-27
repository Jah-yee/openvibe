import { toast } from "sonner";
import { messages } from "@/i18n";
import { agentMessages } from "@/mcp/messages";
import { nodesStore } from "@/store/nodes";
import { notify } from "./events";
import { overruns } from "./mission";
import { missionMessages } from "./messages";
import { isOrchestratorClosed, missionOf, setMission, updateMember } from "./store";

/** How often the missions' clocks are read. */
export const CLOCK_MS = 15_000;

/** One look at every running mission's budgets (spec §8.2); it never stops an agent. */
export function checkBudgets(now = Date.now()) {
  for (const [orchestratorId, record] of Object.entries(nodesStore.getState().nodes)) {
    const mission = missionOf(record);
    if (!mission || isOrchestratorClosed(orchestratorId)) continue;
    const found = overruns(mission, now);
    const lines = messages(agentMessages).lines;
    const said = messages(missionMessages);
    for (const overrun of found.members) {
      const before = mission.members.find((m) => m.nodeId === overrun.nodeId)?.overdue ?? 0;
      if (before < 1) {
        notify(orchestratorId, lines.budgetOver(overrun.name, overrun.task, overrun.budget));
      }
      if (overrun.level === 2) toast.warning(said.overBudgetTwice(overrun.name, overrun.budget));
      updateMember(orchestratorId, overrun.nodeId, { overdue: overrun.level });
    }
    if (found.global) {
      notify(orchestratorId, lines.globalOver(mission.budgetMin ?? 0));
      toast.warning(said.globalOver(mission.name ?? "", mission.budgetMin ?? 0));
      setMission(orchestratorId, { globalOverdue: true });
    }
  }
}

/** For the app's whole life. */
export function installMissionClock(): () => void {
  const timer = setInterval(() => checkBudgets(), CLOCK_MS);
  return () => clearInterval(timer);
}
