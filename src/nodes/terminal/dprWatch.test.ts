import { describe, expect, it, vi } from "vitest";
import { watchDevicePixelRatio } from "./dprWatch";

/** A window whose `(resolution: Ndppx)` queries can be fired by hand. */
function fakeWindow(dpr: number) {
  const queries: { media: string; listeners: (() => void)[] }[] = [];
  const win = {
    devicePixelRatio: dpr,
    matchMedia: (media: string) => {
      const query = { media, listeners: [] as (() => void)[] };
      queries.push(query);
      return {
        addEventListener: (_type: string, listener: () => void) => query.listeners.push(listener),
        removeEventListener: (_type: string, listener: () => void) => {
          query.listeners = query.listeners.filter((l) => l !== listener);
        },
      } as unknown as MediaQueryList;
    },
  };
  const change = (next: number) => {
    win.devicePixelRatio = next;
    queries[queries.length - 1].listeners.forEach((listener) => listener());
  };
  return { win, queries, change };
}

describe("watchDevicePixelRatio", () => {
  it("reports each change of scaling and watches the new one", () => {
    const { win, queries, change } = fakeWindow(1);
    const onChange = vi.fn();
    watchDevicePixelRatio(win, onChange);
    expect(queries.map((q) => q.media)).toEqual(["(resolution: 1dppx)"]);
    change(1.5);
    change(1.25);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(queries.map((q) => q.media)).toEqual(["(resolution: 1dppx)", "(resolution: 1.5dppx)", "(resolution: 1.25dppx)"]);
  });

  it("stops watching", () => {
    const { win, queries, change } = fakeWindow(1);
    const onChange = vi.fn();
    const stop = watchDevicePixelRatio(win, onChange);
    stop();
    expect(queries[0].listeners).toEqual([]);
    change(2);
    expect(onChange).not.toHaveBeenCalled();
  });
});
