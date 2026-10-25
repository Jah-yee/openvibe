/**
 * Counters of a group label (spec habillage §11.4): "4 · 2 en cours", or
 * "4 · inactif".
 */
export function countsText(members: number, working: number): string {
  return `${members} · ${working > 0 ? `${working} en cours` : "inactif"}`;
}

/** Names of the members still running, listed by the "Fermer le groupe" confirmation (spec §11.4). */
export function livingAgents(
  memberIds: readonly string[],
  nameOf: (id: string) => string,
  running: (id: string) => boolean,
): string[] {
  return memberIds.filter(running).map(nameOf);
}

/** "· 1 attend", shown in amber after the counters; null when nobody waits. */
export function waitingText(waiting: number): string | null {
  if (waiting <= 0) return null;
  return `· ${waiting} ${waiting > 1 ? "attendent" : "attend"}`;
}

/** "1 agent", "8 agents". */
export function agentsText(count: number): string {
  return count > 1 ? `${count} agents` : `${count} agent`;
}

/** "0 groupe", "2 groupes". */
export function groupsText(count: number): string {
  return count > 1 ? `${count} groupes` : `${count} groupe`;
}
