import { describe, expect, it } from "vitest";
import capability from "../../src-tauri/capabilities/default.json";
import conf from "../../src-tauri/tauri.conf.json";

describe("window configuration (spec fenêtre §4.7)", () => {
  it("lets the page set the window title", () => {
    expect(capability.permissions).toContain("core:window:allow-set-title");
  });

  it("draws its own title bar", () => {
    expect(conf.app.windows[0].decorations).toBe(false);
  });

  it("lets the page move, minimize, maximize and close the window", () => {
    expect(capability.permissions).toEqual(
      expect.arrayContaining([
        "core:window:allow-start-dragging",
        "core:window:allow-minimize",
        "core:window:allow-toggle-maximize",
        "core:window:allow-close",
      ]),
    );
  });
});
