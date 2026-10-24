import { describe, expect, it } from "vitest";
import type { NodeRecord } from "@/store/nodes";
import type { TerminalStatus } from "@/store/terminalStatus";
import { resumableTerminals } from "./resumable";

const node = (workspaceId: string) => ({ workspaceId, kind: "terminal", payload: {} }) as unknown as NodeRecord;

describe("resumableTerminals", () => {
  it("lists the stopped terminals of a workspace, unknown status counting as stopped", () => {
    const nodes = { a: node("w1"), b: node("w1"), c: node("w1"), d: node("w1"), e: node("w2"), f: node("w1") };
    const statuses: Record<string, TerminalStatus> = {
      a: { state: "stopped" },
      b: { state: "running" },
      c: { state: "exited", code: 0 },
      d: { state: "error", message: "x" },
      e: { state: "stopped" },
    };
    expect(resumableTerminals(nodes, statuses, "w1", new Set())).toEqual(["a", "f"]);
  });

  it("skips terminals still running in Rust after a webview reload", () => {
    const nodes = { a: node("w1") };
    expect(resumableTerminals(nodes, {}, "w1", new Set(["a"]))).toEqual([]);
  });
});
