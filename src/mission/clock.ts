import { toast } from "sonner";
import { nodesStore } from "@/store/nodes";
import { notify } from "./events";
import { overruns } from "./mission";
import { missionOf, setMission, updateMember } from "./store";

/** How often the missions' clocks are read. */
export const CLOCK_MS = 15_000;

/** One look at every running mission's budgets (spec §8.2); it never stops an agent. */
export function checkBudgets(now = Date.now()) {
  for (const [orchestratorId, record] of Object.entries(nodesStore.getState().nodes)) {
    const mission = missionOf(record);
    if (!mission) continue;
    const found = overruns(mission, now);
    for (const overrun of found.members) {
      const before = mission.members.find((m) => m.nodeId === overrun.nodeId)?.overdue ?? 0;
      if (before < 1) {
        notify(
          orchestratorId,
          `Budget écoulé : ${overrun.name} (${overrun.task}) a passé ses ${overrun.budget} min sans rendre compte. Décide : ecrire, prolonger, interrompre ou reattribuer.`,
        );
      }
      if (overrun.level === 2) toast.warning(`${overrun.name} a dépassé deux fois son budget (${overrun.budget} min) sans rendre compte.`);
      updateMember(orchestratorId, overrun.nodeId, { overdue: overrun.level });
    }
    if (found.global) {
      notify(orchestratorId, `Budget global écoulé (${mission.budgetMin} min) : termine avec ce qui est fait.`);
      toast.warning(`Budget global de la mission ${mission.name ?? ""} écoulé (${mission.budgetMin} min).`);
      setMission(orchestratorId, { globalOverdue: true });
    }
  }
}

/** For the app's whole life. */
export function installMissionClock(): () => void {
  const timer = setInterval(() => checkBudgets(), CLOCK_MS);
  return () => clearInterval(timer);
}
