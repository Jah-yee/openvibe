// Excalidraw scales embeddables with a CSS transform, which resamples the
// terminal's WebGL canvas: blurry when zoomed. The terminal is instead drawn
// in a box at screen resolution (counter-scaled by 1 / zoom) with a font that
// follows the zoom. Its grid comes from the box alone, so zooming never
// resizes the PTY.

/** Glyph advance and line height of the terminal font at a size, in CSS px. */
export type FontMeasure = (fontSize: number) => { width: number; height: number };

export interface Box {
  width: number;
  height: number;
}

export interface Grid {
  cols: number;
  rows: number;
}

export const BASE_FONT_SIZE = 13;
/** xterm keeps this width for its scrollbar (FitAddon does the same). */
export const SCROLLBAR_WIDTH = 14;
const MIN_COLS = 2;
const MIN_ROWS = 1;

/**
 * Font size whose glyph advance is `cell` device pixels. xterm's WebGL renderer
 * floors the advance to whole pixels: a 7.6 px glyph squeezed into a 7 px cell
 * overlaps its neighbours. The small margin survives float rounding.
 */
export function fontForCell(cell: number, measure: FontMeasure, dpr: number): number {
  const advancePerPx = measure(100).width / 100;
  return (cell + 0.01) / (advancePerPx * dpr);
}

function cellHeight(fontSize: number, measure: FontMeasure, dpr: number): number {
  return Math.ceil(measure(fontSize).height * dpr);
}

/** Columns and rows of a terminal box of CSS size `box`, the same at every zoom. */
export function gridFor(box: Box, measure: FontMeasure, dpr: number): Grid {
  const width = Math.max(1, Math.round((measure(100).width / 100) * BASE_FONT_SIZE * dpr));
  const height = cellHeight(fontForCell(width, measure, dpr), measure, dpr);
  return {
    cols: Math.max(MIN_COLS, Math.floor(((box.width - SCROLLBAR_WIDTH) * dpr) / width)),
    rows: Math.max(MIN_ROWS, Math.floor((box.height * dpr) / height)),
  };
}

/** Font size drawing `grid` with the widest whole-pixel cell that fits the box at `zoom`. */
export function fontFor(grid: Grid, box: Box, zoom: number, measure: FontMeasure, dpr: number): number {
  const width = (box.width * zoom - SCROLLBAR_WIDTH) * dpr;
  const height = box.height * zoom * dpr;
  let cell = Math.max(1, Math.floor(width / grid.cols));
  while (cell > 1 && grid.rows * cellHeight(fontForCell(cell, measure, dpr), measure, dpr) > height) cell--;
  return fontForCell(cell, measure, dpr);
}

/** Past this zoom, Excalidraw's own scale enlarges the terminal (a little soft) instead of a bigger canvas. */
export const MAX_RENDER_ZOOM = 4;
/** Largest side of a terminal's canvas, in device pixels (D3D11 textures stop at 16384). */
export const MAX_CANVAS_SIDE = 8192;

/**
 * The zoom a terminal is drawn at: the canvas zoom, capped so its WebGL canvas
 * (box × zoom × dpr) keeps a reasonable size in graphics memory.
 */
export function renderZoom(zoom: number, box: Box, dpr: number): number {
  const side = Math.max(box.width, box.height) * dpr;
  return Math.min(zoom, MAX_RENDER_ZOOM, MAX_CANVAS_SIDE / side);
}

/** Measures `fontFamily` the way xterm does (canvas text metrics of "W"). */
export function canvasMeasure(fontFamily: string): FontMeasure {
  const context = new OffscreenCanvas(1, 1).getContext("2d");
  const cache = new Map<number, { width: number; height: number }>();
  return (fontSize) => {
    const known = cache.get(fontSize);
    if (known) return known;
    if (!context) return { width: fontSize * 0.6, height: fontSize * 1.2 };
    context.font = `${fontSize}px ${fontFamily}`;
    const metrics = context.measureText("W");
    const size = { width: metrics.width, height: metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent };
    cache.set(fontSize, size);
    return size;
  };
}
