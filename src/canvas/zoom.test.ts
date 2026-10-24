import { describe, expect, it } from "vitest";
import { stepZoom, zoomAroundCenter } from "./zoom";

describe("stepZoom", () => {
  it("moves by 10 % and stays between 10 % and 3000 %", () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(0.56, 1)).toBe(0.7);
    expect(stepZoom(0.1, -1)).toBe(0.1);
    expect(stepZoom(30, 1)).toBe(30);
  });
});

describe("zoomAroundCenter", () => {
  it("keeps the scene point at the center of the viewport in place", () => {
    const view = { scrollX: 100, scrollY: 50, zoom: 1, width: 800, height: 600 };
    const next = zoomAroundCenter(view, 2);
    expect({ x: 400 / 2 - next.scrollX, y: 300 / 2 - next.scrollY }).toEqual({ x: 400 - 100, y: 300 - 50 });
    expect(next.zoom).toBe(2);
  });
});
