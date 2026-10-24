/**
 * Counters of a group label (spec habillage §11.4): "4 · 2 en cours", or
 * "4 · inactif". Until J3, "en cours" counts the running members.
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
