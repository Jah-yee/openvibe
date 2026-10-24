import { describe, expect, it } from "vitest";
import { countsText, livingAgents } from "./groupSummary";

describe("countsText", () => {
  it("shows the members and those at work", () => {
    expect(countsText(4, 2)).toBe("4 · 2 en cours");
  });

  it("says inactif when nobody works", () => {
    expect(countsText(3, 0)).toBe("3 · inactif");
    expect(countsText(0, 0)).toBe("0 · inactif");
  });
});

describe("livingAgents", () => {
  it("names the members still running, in group order", () => {
    const names: Record<string, string> = { a: "Isis", b: "Osiris", c: "Horus" };
    expect(livingAgents(["a", "b", "c"], (id) => names[id], (id) => id !== "b")).toEqual(["Isis", "Horus"]);
  });
});
