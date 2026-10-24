import { debounce } from "@/lib/debounce";

/** Spec §6.4: the PTY is resized 50 ms after a node stops changing size, not on every frame. */
export const FIT_DELAY_MS = 50;

export function createFitScheduler(fit: () => void, delayMs = FIT_DELAY_MS) {
  const run = debounce(fit, delayMs);
  return { schedule: () => run(), cancel: () => run.cancel() };
}
