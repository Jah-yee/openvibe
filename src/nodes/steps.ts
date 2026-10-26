/** A step an agent declared (spec orchestrateur §4.4, §5): its frieze shows them in order. */
export type StepState = "a_venir" | "en_cours" | "fait" | "echec";

export interface Step {
  title: string;
  state: StepState;
}

export const MAX_STEPS = 12;
export const MAX_STEP_TITLE = 40;
const STATES: readonly string[] = ["a_venir", "en_cours", "fait", "echec"];
const MARKS: readonly string[] = ["en_cours", "fait", "echec"];

const titleOf = (raw: unknown) => (typeof raw === "string" && raw.trim() ? raw.trim().slice(0, MAX_STEP_TITLE) : null);

/** Steps saved in a terminal's payload; undefined when absent or unreadable. */
export function readSteps(raw: unknown): Step[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_STEPS) return undefined;
  const steps = raw.map((s) => (typeof s === "object" && s !== null ? (s as Record<string, unknown>) : {}));
  if (!steps.every((s) => titleOf(s.title) && typeof s.state === "string" && STATES.includes(s.state))) return undefined;
  return steps.map((s) => ({ title: titleOf(s.title)!, state: s.state as StepState }));
}

/** `declarer_etapes`: the steps, all to come; or what is wrong. */
export function declaredSteps(raw: unknown): Step[] | string {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_STEPS) return `Donne entre 1 et ${MAX_STEPS} étapes.`;
  const titles = raw.map(titleOf);
  if (titles.some((t) => t === null)) return "Chaque étape est un titre court.";
  return titles.map((title) => ({ title: title!, state: "a_venir" }));
}

/** `etape`: the step of that title (case aside) takes the state; an unknown one is added at the end. */
export function markedSteps(steps: readonly Step[], rawTitle: unknown, state: unknown): Step[] | string {
  const title = titleOf(rawTitle);
  if (!title) return "Chaque étape est un titre court.";
  if (typeof state !== "string" || !MARKS.includes(state)) return `État inconnu : ${String(state)} (en_cours, fait ou echec).`;
  const at = steps.findIndex((s) => s.title.toLowerCase() === title.toLowerCase());
  if (at === -1) return steps.length >= MAX_STEPS ? `Pas plus de ${MAX_STEPS} étapes.` : [...steps, { title, state: state as StepState }];
  return steps.map((s, i) => (i === at ? { ...s, state: state as StepState } : s));
}
