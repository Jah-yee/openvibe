import { canvasStore } from "@/canvas/canvasStore";
import { AGENTS } from "@/fleet/catalog";
import { linkedAgents, NO_LINKS } from "@/fleet/wires";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore, terminalOf, type NodeRecord } from "@/store/nodes";
import { isRunning } from "@/store/terminalStatus";
import { NEW_MISSION, type Member, type Mission } from "./mission";

/** An orchestrator's mission — a fresh one until it has its own; undefined for any other node. */
export function missionOf(record: NodeRecord | undefined): Mission | undefined {
  return record?.kind === "orchestrator" ? (record.payload.mission ?? NEW_MISSION) : undefined;
}

export function setMission(orchestratorId: string, patch: Partial<Mission>) {
  const mission = missionOf(nodesStore.getState().nodes[orchestratorId]);
  if (mission) nodesStore.getState().update(orchestratorId, { mission: { ...mission, ...patch } });
}

export function updateMember(orchestratorId: string, nodeId: string, patch: Partial<Member>) {
  const mission = missionOf(nodesStore.getState().nodes[orchestratorId]);
  if (mission) setMission(orchestratorId, { members: mission.members.map((m) => (m.nodeId === nodeId ? { ...m, ...patch } : m)) });
}

/** The running mission an agent works for, once its sub-task was sent (spec §7.5). */
export function memberOf(nodeId: string): { orchestratorId: string; member: Member } | null {
  for (const [orchestratorId, record] of Object.entries(nodesStore.getState().nodes)) {
    const mission = missionOf(record);
    if (mission?.state !== "en_cours") continue;
    const member = mission.members.find((m) => m.nodeId === nodeId && m.sentAt !== undefined);
    if (member) return { orchestratorId, member };
  }
  return null;
}

/** The Claude agents wired to an orchestrator: only they have OpenVibe's tools for a mission (spec §2). */
export function linkedClaudeAgents(orchestratorId: string): { nodeId: string; name: string }[] {
  const { links, frames } = canvasStore.getState();
  const nodes = nodesStore.getState().nodes;
  return linkedAgents(links[orchestratorId] ?? NO_LINKS, frames).agentIds.flatMap((nodeId) => {
    const payload = terminalOf(nodes[nodeId]);
    return payload?.agent === "claude" ? [{ nodeId, name: payload.name || AGENTS.claude.label }] : [];
  });
}

export type AgentState = "travaille" | "attend" | "inactif" | "arrêté";

/** An agent's state as the orchestrator reads it (spec §7.2 `equipe`). */
export function agentState(nodeId: string): AgentState {
  if (!isRunning(nodeId)) return "arrêté";
  const activity = agentActivityStore.getState().activities[nodeId]?.activity;
  return activity === "working" ? "travaille" : activity === "waiting" ? "attend" : "inactif";
}
