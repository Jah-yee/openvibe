import type { SceneFrame } from "@/canvas/groups";
import { agentsText } from "./groupSummary";

/** Who a command goes to (spec habillage §12). */
export type Target = { kind: "all" } | { kind: "group"; id: string } | { kind: "agent"; id: string };

/** One line of the `@` list. */
export interface TargetOption {
  target: Target;
  /** "@tous", "@backend", "@isis". */
  label: string;
  /** In grey: the size of a group, or the group of an agent ("Hors groupe"). */
  detail: string;
}

/** An agent as the `@` list sees it. */
export interface TargetAgent {
  id: string;
  name: string;
  groupName: string | null;
}

/** "Équipe Back" → "equipeback": no spaces nor accents, lower case. */
export function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function targetKey(target: Target): string {
  return target.kind === "all" ? "all" : `${target.kind}:${target.id}`;
}

export function uniqueTargets(targets: readonly Target[]): Target[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = targetKey(target);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The terminals among `ids` (those `nameOf` names), with their group. */
export function targetAgents(
  ids: readonly string[],
  nameOf: (id: string) => string | undefined,
  frames: readonly SceneFrame[],
): TargetAgent[] {
  return ids.flatMap((id) => {
    const name = nameOf(id);
    if (name === undefined) return [];
    const group = frames.find((f) => f.group !== null && f.memberIds.includes(id));
    return [{ id, name, groupName: group?.name ?? null }];
  });
}

/** @tous, then the groups, then the agents; two agents of the same name both show, with their group (spec §12). */
export function targetOptions(agents: readonly TargetAgent[], groups: readonly SceneFrame[]): TargetOption[] {
  const all: TargetOption = { target: { kind: "all" }, label: "@tous", detail: agentsText(agents.length) };
  const groupOptions = groups
    .filter((g) => g.group !== null && slug(g.name))
    .map((g): TargetOption => ({ target: { kind: "group", id: g.id }, label: `@${slug(g.name)}`, detail: agentsText(g.memberIds.length) }));
  const agentOptions = agents
    .filter((a) => slug(a.name))
    .map((a): TargetOption => ({ target: { kind: "agent", id: a.id }, label: `@${slug(a.name)}`, detail: a.groupName ?? "Hors groupe" }));
  return [all, ...groupOptions, ...agentOptions];
}

/** The options whose name starts with the query, then those containing it; case and accents ignored. */
export function matchOptions(options: readonly TargetOption[], query: string): TargetOption[] {
  const wanted = slug(query);
  const name = (option: TargetOption) => option.label.slice(1);
  const starts = options.filter((o) => name(o).startsWith(wanted));
  const contains = options.filter((o) => !name(o).startsWith(wanted) && name(o).includes(wanted));
  return [...starts, ...contains];
}

/** The `@word` being typed at the caret: where its `@` is and what follows it. */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
  return match ? { start: caret - match[2].length - 1, query: match[2] } : null;
}

/** `text` without the mention from `start` to `end`, and one space after it. */
export function withoutMention(text: string, start: number, end: number): { text: string; caret: number } {
  return { text: text.slice(0, start) + text.slice(end).replace(/^ /, ""), caret: start };
}

/**
 * Typed `@names` that match exactly one option become targets and leave the
 * text ("@tous lance les tests", "@tous, lancez…") with the punctuation and
 * the space that follow them; ambiguous or unknown ones stay as typed. The
 * rest of the command keeps its spaces (indented code, tabs).
 */
export function extractMentions(text: string, options: readonly TargetOption[]): { targets: Target[]; text: string } {
  const targets: Target[] = [];
  const mention = /(^|\s)@([^\s@,;:.!?…]+)[,;:.!?…]*(?=\s|$) ?/g;
  const rest = text.replace(mention, (whole: string, before: string, word: string) => {
    const found = options.filter((o) => o.label === `@${slug(word)}`);
    if (found.length !== 1) return whole;
    targets.push(found[0].target);
    return before;
  });
  return { targets, text: rest.trim() };
}

/**
 * The terminals a command goes to, once each, in the order of the targets;
 * without targets, `fallback` (the selection, or an orchestrator's agents).
 * Only terminals of `scope.all` count.
 */
export function resolveTargets(
  targets: readonly Target[],
  scope: { all: readonly string[]; groups: readonly SceneFrame[] },
  fallback: readonly string[],
): string[] {
  const ids: string[] = [];
  if (targets.length === 0) ids.push(...fallback);
  for (const target of targets) {
    if (target.kind === "all") ids.push(...scope.all);
    else if (target.kind === "group") ids.push(...(scope.groups.find((g) => g.id === target.id)?.memberIds ?? []));
    else ids.push(target.id);
  }
  return [...new Set(ids)].filter((id) => scope.all.includes(id));
}

/** Without `@`: the selected terminals and the members of the selected groups (spec §12). */
export function selectionTargets(
  selectedIds: readonly string[],
  frames: readonly SceneFrame[],
  terminalIds: readonly string[],
): string[] {
  const ids: string[] = [];
  for (const id of selectedIds) {
    if (terminalIds.includes(id)) ids.push(id);
    const frame = frames.find((f) => f.id === id && f.group !== null);
    if (frame) ids.push(...frame.memberIds);
  }
  return [...new Set(ids)];
}
