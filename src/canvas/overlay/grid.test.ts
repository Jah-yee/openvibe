import { describe, expect, it } from "vitest";
import { dotGrid } from "./grid";

describe("dotGrid", () => {
  it("spaces dots 32 scene units apart and follows the scroll", () => {
    expect(dotGrid({ scrollX: 0, scrollY: 0, zoom: 1 })).toEqual({ step: 32, x: 0, y: 0 });
    expect(dotGrid({ scrollX: 40, scrollY: -8, zoom: 1 })).toEqual({ step: 32, x: 8, y: 24 });
  });

  it("never draws dots closer than 16 px", () => {
    expect(dotGrid({ scrollX: 0, scrollY: 0, zoom: 0.25 }).step).toBe(16);
    expect(dotGrid({ scrollX: 0, scrollY: 0, zoom: 0.1 }).step).toBeCloseTo(25.6);
    expect(dotGrid({ scrollX: 0, scrollY: 0, zoom: 2 }).step).toBe(64);
  });
});
