import { describe, expect, it } from "vitest";
import type { NodeRecord } from "./nodes";
import { countRunning } from "./running";
import type { TerminalStatus } from "./terminalStatus";

const node = (workspaceId: string) => ({ workspaceId, kind: "terminal", payload: {} }) as unknown as NodeRecord;

describe("countRunning", () => {
  it("counts the running terminals of the given workspaces", () => {
    const nodes = { a: node("w1"), b: node("w1"), c: node("w2"), d: node("w3") };
    const statuses: Record<string, TerminalStatus> = {
      a: { state: "running" },
      b: { state: "exited", code: 0 },
      c: { state: "running" },
      d: { state: "running" },
    };
    expect(countRunning(nodes, statuses, ["w1"])).toBe(1);
    expect(countRunning(nodes, statuses, ["w1", "w2"])).toBe(2);
    expect(countRunning(nodes, statuses, [])).toBe(0);
  });
});
