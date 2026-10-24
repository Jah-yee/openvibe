import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFitScheduler } from "./fitScheduler";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("fits once, 50 ms after the size stopped changing", () => {
  const fit = vi.fn();
  const scheduler = createFitScheduler(fit);
  for (let frame = 0; frame < 10; frame++) {
    scheduler.schedule(); // one call per animation frame while a node is dragged
    vi.advanceTimersByTime(16);
  }
  expect(fit).not.toHaveBeenCalled();
  vi.advanceTimersByTime(50);
  expect(fit).toHaveBeenCalledTimes(1);
});

it("cancel drops a pending fit", () => {
  const fit = vi.fn();
  const scheduler = createFitScheduler(fit);
  scheduler.schedule();
  scheduler.cancel();
  vi.advanceTimersByTime(100);
  expect(fit).not.toHaveBeenCalled();
});
