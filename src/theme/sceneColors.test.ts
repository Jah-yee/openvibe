import { describe, expect, it } from "vitest";
import { toDisplayColor, toSceneColor } from "./sceneColors";

describe("scene colors under Excalidraw's dark filter", () => {
  it("matches reference values", () => {
    expect(toDisplayColor("#1e1e1e")).toBe("#d3d3d3");
    expect(toDisplayColor("#ffffff")).toBe("#121212");
    expect(toSceneColor("#5E9A55")).toBe("#448a3a");
    expect(toSceneColor("#EDE8DF")).toBe("#0b0500");
  });

  it("round-trips colors the filter can show", () => {
    for (const color of ["#5e9a55", "#4b5675", "#12110e"]) {
      expect(toDisplayColor(toSceneColor(color))).toBe(color === "#12110e" ? "#121210" : color);
    }
  });

  it("leaves non-hex values alone", () => {
    expect(toSceneColor("transparent")).toBe("transparent");
    expect(toDisplayColor("transparent")).toBe("transparent");
  });
});
