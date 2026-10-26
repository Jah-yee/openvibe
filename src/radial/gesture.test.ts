import { describe, expect, it } from "vitest";
import { isSlide, ringCenter, slotAt, slotPosition } from "./gesture";

describe("the ring's geometry (spec menu radial §5)", () => {
  it("places the eight buttons clockwise from the top, 84 px from the center", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(slotPosition)).toEqual([
      { x: 0, y: -84 },
      { x: 59, y: -59 },
      { x: 84, y: 0 },
      { x: 59, y: 59 },
      { x: 0, y: 84 },
      { x: -59, y: 59 },
      { x: -84, y: 0 },
      { x: -59, y: -59 },
    ]);
  });

  it("points at the slot in the pointer's direction, by eighths, nothing in the dead zone", () => {
    const center = { x: 100, y: 100 };
    const toward = (dx: number, dy: number) => slotAt(center, { x: 100 + dx, y: 100 + dy });
    expect([toward(0, -50), toward(40, -40), toward(50, 0), toward(40, 40), toward(0, 50), toward(-40, 40), toward(-50, 0), toward(-40, -40)]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(toward(19, -50)).toBe(0);
    expect(toward(22, -40)).toBe(1);
    expect(toward(10, 10)).toBeNull();
  });

  it("tells a slide from a click by 6 px", () => {
    expect(isSlide({ x: 0, y: 0 }, { x: 4, y: 4 })).toBe(false);
    expect(isSlide({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
  });

  it("keeps the ring inside the window, its pill included, 8 px from the edges", () => {
    const window = { width: 1000, height: 800 };
    expect(ringCenter({ x: 500, y: 400 }, window)).toEqual({ x: 500, y: 400 });
    expect(ringCenter({ x: 10, y: 10 }, window)).toEqual({ x: 114, y: 114 });
    expect(ringCenter({ x: 995, y: 795 }, window)).toEqual({ x: 886, y: 654 });
  });
});
