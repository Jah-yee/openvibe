import { expect, it, vi } from "vitest";
import type { NodeRecord } from "@/store/nodes";
import { NEW_MISSION } from "./mission";
import { memberBudgets } from "./store";

vi.mock("@excalidraw/excalidraw", () => ({}));

it("gives each agent of a running mission its time and budget, for the bars (spec orchestrateur §8.3)", () => {
  const member = { name: "Isis", task: "Login", budgetMin: 10, linked: false, branch: "b", worktree: "w" };
  const nodes: Record<string, NodeRecord> = {
    chef: {
      workspaceId: "w1",
      kind: "orchestrator",
      payload: { name: "Chef", mission: { ...NEW_MISSION, state: "en_cours", members: [{ ...member, nodeId: "isis", sentAt: 0, extraMin: 5 }, { ...member, nodeId: "horus" }, { ...member, nodeId: "seth", sentAt: 0, handedTo: "Isis" }] } },
    },
    fini: { workspaceId: "w1", kind: "orchestrator", payload: { name: "Fini", mission: { ...NEW_MISSION, state: "terminee", members: [{ ...member, nodeId: "thot", sentAt: 0 }] } } },
  };
  expect(memberBudgets(nodes, 6 * 60_000)).toEqual({ isis: { spent: 6, budget: 15 } });
});
