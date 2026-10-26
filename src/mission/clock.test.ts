// @vitest-environment happy-dom
import { beforeAll, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { toast } from "sonner";
import { nodesStore } from "@/store/nodes";
import { checkBudgets } from "./clock";
import { notify } from "./events";
import { missionOf } from "./store";

vi.mock("@excalidraw/excalidraw", () => ({}));
vi.mock("sonner", () => ({ toast: { warning: vi.fn() } }));
vi.mock("./events", () => ({ notify: vi.fn() }));

const min = 60_000;
beforeAll(async () => {
  mockIPC(() => undefined);
  await nodesStore.getState().create("chef", {
    workspaceId: "w1",
    kind: "orchestrator",
    payload: {
      name: "Chef",
      mission: {
        state: "en_cours",
        name: "Auth",
        maxAgents: 4,
        budgetMin: 30,
        startedAt: 0,
        members: [{ nodeId: "isis", name: "Isis", task: "Login", budgetMin: 10, linked: false, branch: "b", worktree: "w", sentAt: 0 }],
      },
    },
  });
});

it("tells the orchestrator once when a budget runs out, warns the user at 200 % and at the end of the global budget (spec §8.2)", () => {
  checkBudgets(5 * min);
  expect(notify).not.toHaveBeenCalled();
  checkBudgets(11 * min);
  checkBudgets(12 * min);
  expect(vi.mocked(notify).mock.calls).toEqual([
    ["chef", "Budget écoulé : Isis (Login) a passé ses 10 min sans rendre compte. Décide : ecrire, prolonger, interrompre ou reattribuer."],
  ]);
  expect(missionOf(nodesStore.getState().nodes.chef)?.members[0].overdue).toBe(1);
  checkBudgets(21 * min);
  checkBudgets(22 * min);
  expect(toast.warning).toHaveBeenCalledTimes(1);
  expect(toast.warning).toHaveBeenCalledWith("Isis a dépassé deux fois son budget (10 min) sans rendre compte.");
  checkBudgets(31 * min);
  checkBudgets(40 * min);
  expect(vi.mocked(notify).mock.calls[1]).toEqual(["chef", "Budget global écoulé (30 min) : termine avec ce qui est fait."]);
  expect(notify).toHaveBeenCalledTimes(2);
  expect(toast.warning).toHaveBeenLastCalledWith("Budget global de la mission Auth écoulé (30 min).");
  expect(missionOf(nodesStore.getState().nodes.chef)?.globalOverdue).toBe(true);
});
