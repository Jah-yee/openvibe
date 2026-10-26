import type { Step, StepState } from "@/nodes/steps";

/**
 * Between the terminal's bottom edge and its frieze, in scene units: the frieze
 * is drawn at the scene's scale and fits in the 24 between two rows of a group.
 */
export const TIMELINE_GAP = 3;

/** Done, running, to come, failed (spec orchestrateur §5.1; tokens of spec identité). */
export const STEP_COLOR: Record<StepState, string> = {
  fait: "var(--ov-ok)",
  en_cours: "var(--ov-working)",
  a_venir: "var(--ov-text-3)",
  echec: "var(--ov-danger)",
};

export interface Dot {
  x: number;
  /** The width a title may take under its dot. */
  slot: number;
  title: string;
  state: StepState;
  color: string;
}

/** One dot per step, evenly spread, half a slot from each end. */
export function dotsOf(steps: readonly Step[], width: number): Dot[] {
  const slot = width / steps.length;
  return steps.map((step, i) => ({ x: slot * (i + 0.5), slot, title: step.title, state: step.state, color: STEP_COLOR[step.state] }));
}
