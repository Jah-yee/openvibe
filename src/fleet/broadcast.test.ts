// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import type { Activity } from "@/ipc/activity";
import type { AgentId } from "@/ipc/pty";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import {
  canPause,
  canResume,
  pauseAgents,
  pausedStore,
  pausedText,
  RESUME_WINDOW_MS,
  resumeAgents,
  resumedText,
  sendToAgents,
  skippedText,
} from "./broadcast";

let calls: { cmd: string; nodeId: string; text?: string }[];
let dead: Set<string>;

beforeEach(() => {
  calls = [];
  dead = new Set();
  mockIPC((cmd, args) => {
    if (cmd !== "pty_send_text" && cmd !== "pty_interrupt") return;
    const { nodeId, text } = args as { nodeId: string; text?: string };
    if (dead.has(nodeId)) throw { kind: "notFound", message: "aucun terminal actif" };
    calls.push({ cmd, nodeId, text });
    return cmd === "pty_interrupt" ? true : undefined;
  });
});
afterEach(() => clearMocks());

async function agent(id: string, agentId: AgentId, state: "running" | "stopped", activity?: Activity) {
  await nodesStore.getState().create(id, {
    workspaceId: "w1",
    kind: "terminal",
    payload: { title: id, name: id[0].toUpperCase() + id.slice(1), agent: agentId, cwd: "C:/code", shell: "default", command: "" },
  });
  terminalStatusStore.getState().set(id, { state });
  if (activity) agentActivityStore.getState().apply({ nodeId: id, activity, since: 0 });
}

describe("sendToAgents", () => {
  it("types the command into the running agents and names the stopped ones", async () => {
    await agent("isis", "claude", "running", "idle");
    await agent("thot", "claude", "stopped");
    await agent("anubis", "codex", "stopped");
    expect(await sendToAgents(["isis", "thot", "anubis"], "lance les tests")).toEqual({ sent: 1, skipped: ["Thot", "Anubis"] });
    expect(calls).toEqual([{ cmd: "pty_send_text", nodeId: "isis", text: "lance les tests" }]);
  });

  it("counts an agent whose process just died as ignored", async () => {
    await agent("osiris", "claude", "running", "idle");
    dead.add("osiris");
    expect(await sendToAgents(["osiris"], "x")).toEqual({ sent: 0, skipped: ["Osiris"] });
  });
});

describe("skippedText / pausedText / resumedText", () => {
  it("says who was ignored and how many were paused or resumed", () => {
    expect(skippedText([])).toBeNull();
    expect(skippedText(["Thot"])).toBe("1 agent arrêté ignoré : Thot");
    expect(skippedText(["Thot", "Anubis"])).toBe("2 agents arrêtés ignorés : Thot, Anubis");
    expect(pausedText(0)).toBe("Aucun agent en cours à mettre en pause");
    expect(pausedText(1)).toBe("1 agent mis en pause");
    expect(pausedText(5)).toBe("5 agents mis en pause");
    expect(resumedText(0)).toBe("Aucun agent mis en pause à reprendre");
    expect(resumedText(3)).toBe("3 agents repris");
  });
});

describe("canPause / canResume", () => {
  it("pauses a running agent at work, never a shell", () => {
    expect(canPause({ agent: "claude", running: true, activity: "working" })).toBe(true);
    expect(canPause({ agent: "claude", running: true, activity: "idle" })).toBe(false);
    expect(canPause({ agent: "claude", running: false, activity: "working" })).toBe(false);
    expect(canPause({ agent: "shell", running: true, activity: "working" })).toBe(false);
  });

  it("resumes a running agent that is idle, never a shell", () => {
    expect(canResume({ agent: "codex", running: true, activity: "idle" })).toBe(true);
    expect(canResume({ agent: "codex", running: true, activity: undefined })).toBe(true);
    expect(canResume({ agent: "codex", running: true, activity: "working" })).toBe(false);
    expect(canResume({ agent: "codex", running: true, activity: "waiting" })).toBe(false);
    expect(canResume({ agent: "shell", running: true, activity: "idle" })).toBe(false);
  });
});

describe("pauseAgents / resumeAgents", () => {
  it("pauses the agents at work and remembers when", async () => {
    await agent("hera", "claude", "running", "working");
    await agent("zeus", "claude", "running", "idle");
    await agent("ares", "shell", "running", "working");
    expect(await pauseAgents(["hera", "zeus", "ares"], 1000)).toBe(1);
    expect(calls).toEqual([{ cmd: "pty_interrupt", nodeId: "hera", text: undefined }]);
    expect(pausedStore.getState().pausedAt.hera).toBe(1000);
  });

  it("resumes only the agents it paused less than a day ago, once idle", async () => {
    const now = 10 * RESUME_WINDOW_MS;
    await agent("ra", "claude", "running", "idle");
    await agent("ptah", "claude", "running", "idle");
    await agent("seth", "claude", "running", "idle");
    await agent("bastet", "claude", "running", "working");
    pausedStore.getState().mark(["ra", "bastet"], now - 3_600_000);
    pausedStore.getState().mark(["seth"], now - RESUME_WINDOW_MS - 1);
    expect(await resumeAgents(["ra", "ptah", "seth", "bastet"], now)).toBe(1);
    expect(calls).toEqual([{ cmd: "pty_send_text", nodeId: "ra", text: "continue" }]);
    expect(pausedStore.getState().pausedAt.ra).toBeUndefined();
    expect(pausedStore.getState().pausedAt.bastet).toBeDefined();
  });
});
