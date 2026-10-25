import type { AgentId } from "@/ipc/pty";
import { ROLES, type RoleId } from "./roles";

export const DEFAULT_GROUP_SIZE = 4;
/** Spec habillage §20: at most 12 agents per group. */
export const MAX_GROUP_SIZE = 12;

/** A slot of "Composer un groupe": an agent, or null for the default agent. */
export type Slot = AgentId | null;

/** The slots of a group of `count` agents (1 to 12), keeping those already chosen. */
export function resizeSlots(slots: readonly Slot[], count: number): Slot[] {
  const n = Math.min(MAX_GROUP_SIZE, Math.max(1, Math.round(count)));
  return Array.from({ length: n }, (_, i) => slots[i] ?? null);
}

/** The name field follows the role until the user types another name (spec §11.2). */
export function nameAfterRoleChange(name: string, previous: RoleId, next: RoleId): string {
  const typed = name.trim();
  return typed === "" || typed === ROLES[previous].label ? ROLES[next].label : name;
}

export function agentsOf(slots: readonly Slot[], fallback: AgentId): AgentId[] {
  return slots.map((slot) => slot ?? fallback);
}
