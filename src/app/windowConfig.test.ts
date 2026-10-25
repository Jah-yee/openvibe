import { describe, expect, it } from "vitest";
import capability from "../../src-tauri/capabilities/default.json";

describe("window configuration (spec fenêtre §4.7)", () => {
  it("lets the page set the window title", () => {
    expect(capability.permissions).toContain("core:window:allow-set-title");
  });
});
