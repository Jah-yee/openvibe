import { describe, expect, it } from "vitest";
import { toSceneColor } from "@/theme/sceneColors";
import { PEN_COLORS, PEN_WIDTHS, railToolOf } from "./tools";

describe("railToolOf", () => {
  it("lights the rail button of Excalidraw's active tool", () => {
    expect(railToolOf("selection")).toBe("selection");
    expect(railToolOf("lasso")).toBe("selection");
    for (const shape of ["rectangle", "ellipse", "diamond", "line", "arrow", "frame"]) {
      expect(railToolOf(shape)).toBe("shapes");
    }
    expect(railToolOf("text")).toBe("text");
    expect(railToolOf("freedraw")).toBe("pen");
    expect(railToolOf("eraser")).toBe("eraser");
    expect(railToolOf("image")).toBe("image");
    expect(railToolOf("hand")).toBeNull();
  });
});

describe("pen palette", () => {
  it("offers 8 colors that all convert to scene colors, and 5 widths", () => {
    expect(PEN_COLORS).toHaveLength(8);
    for (const { display } of PEN_COLORS) expect(toSceneColor(display)).toMatch(/^#[0-9a-f]{6}$/);
    expect(PEN_WIDTHS).toEqual([1, 2, 4, 6, 8]);
  });
});
