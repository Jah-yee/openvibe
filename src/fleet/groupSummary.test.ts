import { describe, expect, it } from "vitest";
import { countsText } from "./groupSummary";

describe("countsText", () => {
  it("shows the members and those at work", () => {
    expect(countsText(4, 2)).toBe("4 · 2 en cours");
  });

  it("says inactif when nobody works", () => {
    expect(countsText(3, 0)).toBe("3 · inactif");
    expect(countsText(0, 0)).toBe("0 · inactif");
  });
});
