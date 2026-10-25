import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutostart } from "./autostart";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("autostart", () => {
  it("starts a marked terminal on its first mount, once", () => {
    const autostart = createAutostart();
    const start = vi.fn();
    autostart.mark("a");
    expect(autostart.run("a", start)).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
    expect(autostart.run("a", start)).toBe(false);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("ignores terminals nobody marked (restored ones)", () => {
    const start = vi.fn();
    expect(createAutostart().run("x", start)).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it("starts the agents of a group one after the other", () => {
    const autostart = createAutostart();
    const started: string[] = [];
    ["a", "b", "c"].forEach((id, i) => autostart.mark(id, i * 300));
    ["a", "b", "c"].forEach((id) => autostart.run(id, () => started.push(id)));
    expect(started).toEqual(["a"]);
    vi.advanceTimersByTime(300);
    expect(started).toEqual(["a", "b"]);
    vi.advanceTimersByTime(300);
    expect(started).toEqual(["a", "b", "c"]);
  });

  it("never starts a terminal removed before its turn", () => {
    const autostart = createAutostart();
    const start = vi.fn();
    autostart.mark("a", 300);
    autostart.run("a", start);
    autostart.cancel("a");
    vi.advanceTimersByTime(1000);
    expect(start).not.toHaveBeenCalled();
  });
});
