import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("calls once, with the last arguments, after the delay", () => {
  const fn = vi.fn();
  const save = debounce(fn, 500);
  save(1);
  save(2);
  vi.advanceTimersByTime(499);
  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith(2);
});

it("flush runs the pending call immediately and returns its result", () => {
  const save = debounce((n: number) => n * 2, 500);
  save(21);
  expect(save.flush()).toBe(42);
  expect(save.flush()).toBeUndefined();
  vi.advanceTimersByTime(1000);
});

it("cancel drops the pending call", () => {
  const fn = vi.fn();
  const save = debounce(fn, 500);
  save(1);
  save.cancel();
  vi.advanceTimersByTime(1000);
  expect(fn).not.toHaveBeenCalled();
});
