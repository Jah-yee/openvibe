import { describe, expect, it } from "vitest";
import { agentsOf, nameAfterRoleChange, resizeSlots } from "./composer";

describe("resizeSlots", () => {
  it("keeps the agents already chosen and adds default slots", () => {
    expect(resizeSlots(["codex"], 3)).toEqual(["codex", null, null]);
  });

  it("drops the last slots when the group shrinks", () => {
    expect(resizeSlots(["codex", "claude", null], 2)).toEqual(["codex", "claude"]);
  });

  it("keeps a group between 1 and 12 agents", () => {
    expect(resizeSlots([], 0)).toHaveLength(1);
    expect(resizeSlots([], 40)).toHaveLength(12);
  });
});

describe("nameAfterRoleChange", () => {
  it("follows the role while the name is the role's label", () => {
    expect(nameAfterRoleChange("Général", "general", "backend")).toBe("Backend");
  });

  it("follows the role when the field is empty", () => {
    expect(nameAfterRoleChange("  ", "general", "docs")).toBe("Docs");
  });

  it("keeps a name the user typed", () => {
    expect(nameAfterRoleChange("API v2", "general", "backend")).toBe("API v2");
  });
});

describe("agentsOf", () => {
  it("gives the default agent to the slots nobody chose", () => {
    expect(agentsOf(["codex", null], "claude")).toEqual(["codex", "claude"]);
  });
});
