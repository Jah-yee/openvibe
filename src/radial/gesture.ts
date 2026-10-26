import type { Point } from "@/fleet/terminals";

/** From the click point to each button's center (spec menu radial §5.1). */
export const RING_RADIUS = 84;
export const BUTTON_SIZE = 44;
/** Between the lowest button and the name pill. */
export const PILL_GAP = 8;
const PILL_HEIGHT = 24;
/** Closer to the center, a slide points at nothing (§5.2). */
export const DEAD_ZONE = 24;
/** Farther from the press, the right button slides rather than clicks. */
export const SLIDE_THRESHOLD = 6;
const MARGIN = 8;
const REACH = RING_RADIUS + BUTTON_SIZE / 2;

/** Where button `slot` sits from the ring's center: 0 at the top, clockwise. */
export function slotPosition(slot: number): Point {
  const angle = ((slot * 45 - 90) * Math.PI) / 180;
  // `+ 0` turns -0 into 0.
  return { x: Math.round(RING_RADIUS * Math.cos(angle)) + 0, y: Math.round(RING_RADIUS * Math.sin(angle)) + 0 };
}

/** The slot a slide points at: the eighth of the circle the pointer is in, none in the dead zone. */
export function slotAt(center: Point, pointer: Point): number | null {
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  if (Math.hypot(dx, dy) < DEAD_ZONE) return null;
  const fromTop = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return (((Math.round(fromTop / 45) % 8) + 8) % 8);
}

/**
 * The slot a slide points at, by its direction from the ring's center; nothing
 * within the dead zone of the press too, for a ring moved off an edge sits away
 * from it: a jitter there would point at a button.
 */
export function slideSlot(center: Point, press: Point, pointer: Point): number | null {
  if (Math.hypot(pointer.x - press.x, pointer.y - press.y) < DEAD_ZONE) return null;
  return slotAt(center, pointer);
}

export function isSlide(press: Point, pointer: Point): boolean {
  return Math.hypot(pointer.x - press.x, pointer.y - press.y) > SLIDE_THRESHOLD;
}

/** The ring's center: the click point, moved off the window's edges so that the ring and its pill show whole. */
export function ringCenter(point: Point, window: { width: number; height: number }): Point {
  const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
  return {
    x: clamp(point.x, REACH + MARGIN, window.width - REACH - MARGIN),
    y: clamp(point.y, REACH + MARGIN, window.height - REACH - PILL_GAP - PILL_HEIGHT - MARGIN),
  };
}
