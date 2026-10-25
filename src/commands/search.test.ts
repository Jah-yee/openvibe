import { describe, expect, it } from "vitest";
import { matchScore, normalize, rank } from "./search";

describe("normalize", () => {
  it("drops case and accents", () => {
    expect(normalize("Hermès ÉCOLE")).toBe("hermes ecole");
  });
});

describe("matchScore (spec fenêtre §7.1)", () => {
  it("finds regardless of case and accents, with letters in order, not necessarily together", () => {
    expect(matchScore("hermes", "Hermès")).not.toBeNull();
    expect(matchScore("ISIS", "Isis")).not.toBeNull();
    expect(matchScore("hrms", "Hermès")).not.toBeNull();
    expect(matchScore("smreh", "Hermès")).toBeNull();
  });

  it("reads the keywords too, every term having to match", () => {
    expect(matchScore("isis cl", "Isis", ["Claude", "Backend", "Workspace 1"])).not.toBeNull();
    expect(matchScore("isis co", "Isis", ["Claude"])).toBeNull();
  });

  it("puts a word start before a match inside a word, and the label before the keywords", () => {
    expect(matchScore("th", "Thot")!).toBeGreaterThan(matchScore("th", "Arthur")!);
    expect(matchScore("ba", "Bastet", ["Claude"])!).toBeGreaterThan(matchScore("ba", "Isis", ["Backend"])!);
  });
});

describe("rank", () => {
  const items = [
    { label: "Arthur", keywords: [] },
    { label: "Thot", keywords: [] },
    { label: "Isis", keywords: ["Claude"] },
  ];
  const textOf = (item: { label: string; keywords: string[] }) => item;

  it("keeps every item in its order without a search", () => {
    expect(rank(items, "  ", textOf)).toEqual(items);
  });

  it("keeps the matches only, best first, ties in their order", () => {
    expect(rank(items, "th", textOf).map((i) => i.label)).toEqual(["Thot", "Arthur"]);
    expect(rank(items, "zz", textOf)).toEqual([]);
  });
});
