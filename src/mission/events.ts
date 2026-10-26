import { ptySendText } from "@/ipc/pty";
import { agentActivityStore } from "@/store/agentActivity";
import { isRunning, terminalStatusStore } from "@/store/terminalStatus";
import { memberOf } from "./store";

/** Lines waiting for their orchestrator to be free. */
const queues = new Map<string, string[]>();

/** An orchestrator takes a line while its session runs and no dialog waits for the user (spec §7.5). */
function free(orchestratorId: string): boolean {
  return isRunning(orchestratorId) && agentActivityStore.getState().activities[orchestratorId]?.activity !== "waiting";
}

function flush(orchestratorId: string) {
  const queue = queues.get(orchestratorId);
  if (!queue?.length || !free(orchestratorId)) return;
  queues.delete(orchestratorId);
  // ptySendText keeps a node's writes in order; Claude queues what comes while it works.
  for (const line of queue) void ptySendText(orchestratorId, `[OpenVibe] ${line}`).catch(() => undefined);
}

/** Types `line` in the orchestrator's terminal, now or as soon as it is free. */
export function notify(orchestratorId: string, line: string) {
  queues.set(orchestratorId, [...(queues.get(orchestratorId) ?? []), line]);
  flush(orchestratorId);
}

export function pendingEvents(orchestratorId: string): readonly string[] {
  return queues.get(orchestratorId) ?? [];
}

/** Watches the members of running missions, and frees held lines when an orchestrator is free again. */
export function installMissionEvents(): () => void {
  const flushAll = () => [...queues.keys()].forEach(flush);
  const offActivity = agentActivityStore.subscribe((state, previous) => {
    for (const [nodeId, now] of Object.entries(state.activities)) {
      if (now.activity !== "waiting" || previous.activities[nodeId]?.activity === "waiting") continue;
      const found = memberOf(nodeId);
      if (found) notify(found.orchestratorId, `${found.member.name} attend une réponse de l'utilisateur (un dialogue est ouvert dans son terminal).`);
    }
    flushAll();
  });
  const offStatus = terminalStatusStore.subscribe((state, previous) => {
    // A terminal removed from the canvas leaves the statuses: it stopped too.
    for (const nodeId of new Set([...Object.keys(previous.statuses), ...Object.keys(state.statuses)])) {
      if (previous.statuses[nodeId]?.state !== "running" || state.statuses[nodeId]?.state === "running") continue;
      const found = memberOf(nodeId);
      if (found) notify(found.orchestratorId, `${found.member.name} s'est arrêté : son terminal ne tourne plus.`);
    }
    flushAll();
  });
  return () => {
    offActivity();
    offStatus();
  };
}
