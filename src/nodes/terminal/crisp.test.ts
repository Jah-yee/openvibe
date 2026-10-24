import { describe, expect, it } from "vitest";
import {
  BASE_FONT_SIZE,
  fontFor,
  fontForCell,
  gridFor,
  MAX_CANVAS_SIDE,
  MAX_RENDER_ZOOM,
  renderZoom,
  SCROLLBAR_WIDTH,
  type FontMeasure,
} from "./crisp";

// Cascadia Code as Chromium measures it: linear advances, ascent and descent
// rounded to whole pixels at each size.
const cascadia: FontMeasure = (size) => ({
  width: size * 0.5859375,
  height: Math.round(size * 0.93) + Math.round(size * 0.23),
});

/** The device pixels xterm's WebGL renderer gives one cell: it floors the advance. */
function deviceCell(fontSize: number, dpr: number) {
  const { width, height } = cascadia(fontSize);
  return { width: Math.floor(width * dpr), height: Math.ceil(height * dpr), advance: width * dpr };
}

const DPRS = [1, 1.25, 1.5, 2];
const ZOOMS = [0.3, 0.5, 0.75, 1, 1.1, 1.3, 1.6, 2, 3];
const box = { width: 640, height: 360 };

describe("crisp terminal font", () => {
  it("gives glyphs whole device pixels instead of squeezing them into narrower cells", () => {
    for (const dpr of DPRS) {
      const grid = gridFor(box, cascadia, dpr);
      for (const zoom of ZOOMS) {
        const cell = deviceCell(fontFor(grid, box, zoom, cascadia, dpr), dpr);
        expect(cell.advance - cell.width).toBeLessThan(0.05);
      }
    }
  });

  it("keeps the base size close to 13 px at zoom 1", () => {
    for (const dpr of DPRS) {
      const font = fontFor(gridFor(box, cascadia, dpr), box, 1, cascadia, dpr);
      expect(Math.abs(font - BASE_FONT_SIZE)).toBeLessThan(1);
    }
  });

  it("draws the same grid inside the zoomed box with the widest cell that fits", () => {
    for (const dpr of DPRS) {
      const grid = gridFor(box, cascadia, dpr);
      for (const zoom of ZOOMS) {
        const width = (box.width * zoom - SCROLLBAR_WIDTH) * dpr;
        const height = box.height * zoom * dpr;
        const cell = deviceCell(fontFor(grid, box, zoom, cascadia, dpr), dpr);
        expect(grid.cols * cell.width).toBeLessThanOrEqual(width);
        expect(grid.rows * cell.height).toBeLessThanOrEqual(height);
        const wider = deviceCell(fontForCell(cell.width + 1, cascadia, dpr), dpr);
        expect(grid.cols * wider.width > width || grid.rows * wider.height > height).toBe(true);
      }
    }
  });

  it("sizes the grid from the box alone", () => {
    expect(gridFor({ width: 14 + 80 * 8, height: 30 * 16 }, cascadia, 1)).toEqual({ cols: 80, rows: 30 });
  });

  it("keeps a minimal grid and a usable font in a tiny box", () => {
    const tiny = { width: 10, height: 4 };
    const grid = gridFor(tiny, cascadia, 1);
    expect(grid).toEqual({ cols: 2, rows: 1 });
    const font = fontFor(grid, tiny, 0.1, cascadia, 1);
    expect(Number.isFinite(font) && font > 0).toBe(true);
  });
});

describe("render zoom", () => {
  it("draws at the canvas zoom while the canvas stays small", () => {
    expect(renderZoom(1.6, box, 1.5)).toBe(1.6);
  });

  it("stops growing the terminal's canvas past a few times the zoom", () => {
    expect(renderZoom(8, box, 1)).toBe(MAX_RENDER_ZOOM);
  });

  it("keeps the canvas of a large terminal under the texture limit", () => {
    const large = { width: 2000, height: 1200 };
    expect(renderZoom(4, large, 2) * large.width * 2).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
  });
});
