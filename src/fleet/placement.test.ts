import { describe, expect, it } from "vitest";
import { clientRectOf, ghostRect, sceneOf, screenRectOf, viewportCenter } from "./placement";

const view = { scrollX: -100, scrollY: 50, zoom: 0.5, offsetLeft: 10, offsetTop: 20, width: 1000, height: 800 };

describe("sceneOf", () => {
  it("is the inverse of Excalidraw's scene-to-screen mapping", () => {
    const scene = { x: 300, y: -40 };
    const client = { x: (scene.x + view.scrollX) * view.zoom + view.offsetLeft, y: (scene.y + view.scrollY) * view.zoom + view.offsetTop };
    expect(sceneOf(client, view)).toEqual(scene);
  });
});

describe("viewportCenter", () => {
  it("is the scene point at the middle of the canvas", () => {
    expect(viewportCenter(view)).toEqual(sceneOf({ x: 10 + 500, y: 20 + 400 }, view));
  });
});

describe("ghostRect", () => {
  it("draws the future terminal centered on the pointer, at the current zoom", () => {
    expect(ghostRect({ x: 400, y: 300 }, 0.5)).toEqual({ left: 220, top: 190, width: 360, height: 220 });
  });
});

describe("screenRectOf", () => {
  it("maps a scene rectangle into the canvas like Excalidraw does", () => {
    expect(screenRectOf({ x: 300, y: -40, width: 100, height: 50 }, view)).toEqual({ x: 100, y: 5, width: 50, height: 25 });
  });
});

describe("clientRectOf", () => {
  it("adds the canvas offset: where the ghost of a terminal snapped into a group shows", () => {
    expect(clientRectOf({ x: 300, y: -40, width: 100, height: 50 }, view)).toEqual({ left: 110, top: 25, width: 50, height: 25 });
  });
});
