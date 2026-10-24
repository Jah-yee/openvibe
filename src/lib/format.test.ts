import { describe, expect, it } from "vitest";
import { formatAgo, plural } from "./format";

describe("formatAgo", () => {
  const now = 1_000_000_000;
  it("says how long ago, in French", () => {
    expect(formatAgo(now - 20_000, now)).toBe("à l'instant");
    expect(formatAgo(now - 5 * 60_000, now)).toBe("il y a 5 min");
    expect(formatAgo(now - 2 * 3_600_000, now)).toBe("il y a 2 h");
    expect(formatAgo(now - 3 * 86_400_000, now)).toBe("il y a 3 j");
    expect(formatAgo(now + 5_000, now)).toBe("à l'instant");
  });
});

describe("plural", () => {
  it("uses the singular for 0 and 1, as French does", () => {
    expect(plural(0, "workspace", "workspaces")).toBe("0 workspace");
    expect(plural(1, "agent actif", "agents actifs")).toBe("1 agent actif");
    expect(plural(3, "agent actif", "agents actifs")).toBe("3 agents actifs");
  });
});
