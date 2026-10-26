// @vitest-environment happy-dom
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { ptySendText } from "@/ipc/pty";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { installMissionEvents, notify, pendingEvents } from "./events";
import type { Member } from "./mission";

vi.mock("@/ipc/pty", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/ipc/pty")>()), ptySendText: vi.fn(() => Promise.resolve()) }));

const member = (nodeId: string, name: string, sentAt?: number): Member => ({ nodeId, name, task: "t", budgetMin: 5, linked: false, branch: `openvibe/m-${nodeId}`, worktree: "C:/w", sentAt });
const activity = (nodeId: string, value: "idle" | "working" | "waiting") => agentActivityStore.getState().apply({ nodeId, activity: value, since: 0 });
const status = (nodeId: string, state: "running" | "stopped" | "exited") =>
  terminalStatusStore.getState().set(nodeId, state === "exited" ? { state, code: 0 } : { state });
const sent = () => vi.mocked(ptySendText).mock.calls.map(([id, text]) => `${id}: ${text}`);

let uninstall: () => void;
beforeAll(async () => {
  mockIPC(() => undefined);
  await nodesStore.getState().create("chef", {
    workspaceId: "w1",
    kind: "orchestrator",
    payload: { name: "Chef", mission: { state: "en_cours", maxAgents: 4, members: [member("isis", "Isis", 1), member("horus", "Horus")] } },
  });
  uninstall = installMissionEvents();
});
afterAll(() => uninstall());
beforeEach(() => {
  status("chef", "running");
  activity("chef", "idle");
  status("isis", "running");
  activity("isis", "working");
  vi.mocked(ptySendText).mockClear();
});

describe("events to the orchestrator (spec orchestrateur §7.5)", () => {
  it("types a line in a free orchestrator at once", () => {
    notify("chef", "Isis a rendu compte (termine) : fait");
    expect(sent()).toEqual(["chef: [OpenVibe] Isis a rendu compte (termine) : fait"]);
  });

  it("holds the lines while it waits for the user or is stopped, then sends them in order", () => {
    activity("chef", "waiting");
    notify("chef", "un");
    notify("chef", "deux");
    expect(sent()).toEqual([]);
    expect(pendingEvents("chef")).toEqual(["un", "deux"]);
    activity("chef", "working");
    status("chef", "stopped");
    notify("chef", "trois");
    status("chef", "running");
    expect(sent()).toEqual(["chef: [OpenVibe] un", "chef: [OpenVibe] deux", "chef: [OpenVibe] trois"]);
    expect(pendingEvents("chef")).toEqual([]);
  });

  it("tells it when a member waits for the user or stops, once its sub-task is sent", () => {
    activity("isis", "waiting");
    status("isis", "exited");
    status("horus", "running");
    activity("horus", "waiting");
    expect(sent()).toEqual([
      "chef: [OpenVibe] Isis attend une réponse de l'utilisateur (un dialogue est ouvert dans son terminal).",
      "chef: [OpenVibe] Isis s'est arrêté : son terminal ne tourne plus.",
    ]);
  });

  it("counts a member's terminal removed from the canvas as stopped", () => {
    terminalStatusStore.getState().remove("isis");
    expect(sent()).toEqual(["chef: [OpenVibe] Isis s'est arrêté : son terminal ne tourne plus."]);
  });
});
