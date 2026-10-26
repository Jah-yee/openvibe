// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { closeGroup, launchGroup } from "@/fleet/groups";
import { linkOrchestrator } from "@/fleet/orchestrators";
import { missionAddAgent, missionCleanup, missionMerge, missionPrepare, type Worktree } from "@/ipc/mission";
import { ptySendText } from "@/ipc/pty";
import { relaunchTerminal } from "@/nodes/terminal/registry";
import type { TerminalPayload } from "@/nodes/types";
import { nodesStore, terminalOf } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { notify } from "./events";
import { whenReady } from "./ready";
import { cleanMission, endMission, launchMission, mergeMission, subTaskText } from "./launch";
import type { Member, Mission } from "./mission";
import { missionOf } from "./store";

vi.mock("@excalidraw/excalidraw", () => ({}));
vi.mock("@/ipc/mission", () => ({ missionPrepare: vi.fn(), missionAddAgent: vi.fn(), missionMerge: vi.fn(), missionCleanup: vi.fn() }));
vi.mock("@/ipc/pty", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ipc/pty")>()),
  ptySendText: vi.fn(() => Promise.resolve()),
  ptyWrite: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/nodes/terminal/registry", () => ({ relaunchTerminal: vi.fn(), quietFor: vi.fn(() => 0), freshText: vi.fn(() => ""), markForAutostart: vi.fn() }));
vi.mock("@/fleet/groups", () => ({ launchGroup: vi.fn(), closeGroup: vi.fn() }));
vi.mock("@/fleet/orchestrators", () => ({ linkOrchestrator: vi.fn() }));
vi.mock("./ready", () => ({ whenReady: vi.fn(() => Promise.resolve(true)) }));
vi.mock("./events", () => ({ notify: vi.fn() }));
vi.mock("./store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./store")>()),
  linkedClaudeAgents: vi.fn(() => [{ nodeId: "isis", name: "Isis" }]),
}));

const session: TerminalPayload = { title: "Chef", name: "Chef", agent: "claude", cwd: "C:/code/proj", shell: "default", command: "", claudeSessionId: "s0", role: "orchestrator" };
const plan = [
  { title: "Login", brief: "Fais le login.", agent: "Isis", budgetMin: 20 },
  { title: "API", brief: "Fais l'API\npuis teste", agent: "nouveau", budgetMin: 30 },
];
const tree = (slug: string): Worktree => ({ slug, branch: `openvibe/${slug}`, path: `C:/code/proj.worktrees/${slug}` });
const member = (nodeId: string, name: string, linked: boolean, extra: Partial<Member> = {}): Member => ({
  nodeId, name, task: "t", budgetMin: 5, linked, branch: `openvibe/auth-${nodeId}`, worktree: `C:/w/${nodeId}`, sentAt: 1, ...extra,
});
const missionNow = () => missionOf(nodesStore.getState().nodes.chef)!;

async function setup(mission: Partial<Mission> = {}) {
  await nodesStore.getState().create("chef", {
    workspaceId: "w1",
    kind: "orchestrator",
    payload: { name: "Chef", session, mission: { state: "plan", maxAgents: 4, members: [], name: "Auth", plan, ...mission } },
  });
  await nodesStore.getState().create("isis", {
    workspaceId: "w1",
    kind: "terminal",
    payload: { ...session, role: undefined, name: "Isis", claudeSessionId: "old", steps: [{ title: "Plan", state: "fait" }] },
  });
}

beforeEach(() => {
  mockIPC(() => undefined);
  vi.clearAllMocks();
  vi.mocked(missionPrepare).mockResolvedValue(tree("auth"));
  vi.mocked(missionAddAgent).mockImplementation(async (_project, mission, agent) => tree(`${mission}-${agent.toLowerCase()}`));
  vi.mocked(launchGroup).mockResolvedValue({ frameId: "f1", nodeIds: ["n1"] });
  for (const id of ["chef", "isis", "n1"]) terminalStatusStore.getState().set(id, { state: "running" });
});

it("writes an agent's sub-task on one line, with its budget, branch and duties (spec §7.3)", () => {
  expect(subTaskText("Auth", plan[1], "openvibe/auth-horus")).toBe(
    "[OpenVibe · mission Auth] API — Fais l'API puis teste. Budget : 30 min. Branche : openvibe/auth-horus. Ce worktree est neuf : les dépendances (node_modules…) n'y sont pas installées. Déclare tes étapes, délègue à tes sous-agents, commit sur ta branche, puis rends compte avec rendre_compte.",
  );
});

describe("launchMission (spec §7.3)", () => {
  it("forms the team: a worktree each, linked agents relaunched there anew, new ones in the mission's group", async () => {
    await setup();
    await launchMission("chef");
    const mission = missionNow();
    const fresh = mission.members[1].name;
    expect(missionPrepare).toHaveBeenCalledWith("C:/code/proj", "Auth");
    expect(vi.mocked(missionAddAgent).mock.calls).toEqual([
      ["C:/code/proj", "auth", "Isis"],
      ["C:/code/proj", "auth", fresh],
    ]);
    const isis = terminalOf(nodesStore.getState().nodes.isis)!;
    expect(isis.cwd).toBe("C:/code/proj.worktrees/auth-isis");
    expect(isis.claudeSessionId).not.toBe("old");
    expect(isis.steps).toBeUndefined();
    expect(relaunchTerminal).toHaveBeenCalledWith("isis", expect.objectContaining({ cwd: isis.cwd, claudeSessionId: isis.claudeSessionId }), "new");
    expect(launchGroup).toHaveBeenCalledWith(
      { name: "Mission Auth", role: "general", agents: ["claude"] },
      expect.anything(),
      undefined,
      expect.objectContaining({ names: [fresh], cwds: [tree(`auth-${fresh.toLowerCase()}`).path] }),
    );
    expect(linkOrchestrator).toHaveBeenCalledWith("chef", "f1");
    expect(mission).toMatchObject({ state: "en_cours", project: "C:/code/proj", slug: "auth", branch: "openvibe/auth", frameId: "f1" });
    expect(mission.members.map((m) => [m.nodeId, m.linked, m.branch])).toEqual([
      ["isis", true, "openvibe/auth-isis"],
      ["n1", false, tree(`auth-${fresh.toLowerCase()}`).branch],
    ]);
    expect(vi.mocked(notify).mock.calls[0]).toEqual(["chef", expect.stringContaining("Feu vert")]);
    await vi.waitFor(() => expect(missionNow().members.every((m) => m.sentAt !== undefined)).toBe(true));
    expect(ptySendText).toHaveBeenCalledWith("isis", subTaskText("Auth", plan[0], "openvibe/auth-isis"));
    expect(ptySendText).toHaveBeenCalledWith("n1", subTaskText("Auth", plan[1], tree(`auth-${fresh.toLowerCase()}`).branch));
  });

  it("judges a linked agent ready only once it is relaunched in its worktree (final review H2)", async () => {
    await setup();
    let relaunched!: () => void;
    vi.mocked(relaunchTerminal).mockReturnValueOnce(new Promise<void>((resolve) => (relaunched = resolve)));
    await launchMission("chef");
    await vi.waitFor(() => expect(ptySendText).toHaveBeenCalledWith("n1", expect.any(String)));
    expect(whenReady).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ptySendText).mock.calls.some(([id]) => id === "isis")).toBe(false);
    relaunched();
    await vi.waitFor(() => expect(ptySendText).toHaveBeenCalledWith("isis", expect.any(String)));
    expect(whenReady).toHaveBeenCalledTimes(2);
  });

  it("takes a mission whose git fails back to its plan, with the error, and launches no one", async () => {
    await setup();
    vi.mocked(missionPrepare).mockRejectedValueOnce(new Error("Le dossier du projet n'est pas un dépôt git."));
    await launchMission("chef");
    expect(missionNow()).toMatchObject({ state: "plan", error: "Le dossier du projet n'est pas un dépôt git.", members: [] });
    expect(notify).toHaveBeenCalledWith("chef", "La mission n'a pas pu démarrer : Le dossier du projet n'est pas un dépôt git.");
    vi.mocked(missionAddAgent).mockResolvedValueOnce(tree("auth-isis")).mockRejectedValueOnce(new Error("La branche openvibe/auth-x existe déjà."));
    await launchMission("chef");
    expect(missionNow()).toMatchObject({ state: "plan", error: "La branche openvibe/auth-x existe déjà." });
    expect(relaunchTerminal).not.toHaveBeenCalled();
    expect(launchGroup).not.toHaveBeenCalled();
  });

  it("forms one team for two go-aheads in a row", async () => {
    await setup();
    let release!: (tree: Worktree) => void;
    vi.mocked(missionPrepare).mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    const first = launchMission("chef");
    await launchMission("chef");
    expect(missionNow().state).toBe("lancement");
    release(tree("auth"));
    await first;
    expect(missionPrepare).toHaveBeenCalledTimes(1);
    expect(launchGroup).toHaveBeenCalledTimes(1);
  });

  it("tells the orchestrator when an agent did not start, instead of typing into nothing", async () => {
    await setup();
    terminalStatusStore.getState().set("n1", { state: "stopped" });
    await launchMission("chef");
    await vi.waitFor(() => expect(notify).toHaveBeenCalledWith("chef", expect.stringContaining("n'a pas démarré")));
    expect(vi.mocked(ptySendText).mock.calls.some(([id]) => id === "n1")).toBe(false);
  });
});

it("ends the mission: created agents closed, linked ones back in the project in a new conversation (spec §7.7)", async () => {
  await setup({ state: "en_cours", project: "C:/code/proj", frameId: "f1", members: [member("isis", "Isis", true), member("n1", "Horus", false)] });
  endMission("chef", "Tout est fait.");
  expect(missionNow()).toMatchObject({ state: "terminee", summary: "Tout est fait." });
  expect(relaunchTerminal).toHaveBeenCalledWith("isis", expect.objectContaining({ cwd: "C:/code/proj" }), "new");
  expect(closeGroup).toHaveBeenCalledWith("f1");
});

it("merges the branches of the agents done, and says what happened to each (spec §7.6)", async () => {
  const done = { summary: "ok", status: "termine" as const, at: 1 };
  await setup({
    state: "en_cours",
    worktree: "C:/w/auth",
    branch: "openvibe/auth",
    members: [member("isis", "Isis", true, { report: done }), member("n1", "Horus", false, { report: done }), member("n2", "Anubis", false, { report: { ...done, status: "bloque" } })],
  });
  vi.mocked(missionMerge).mockImplementation(async (_mission, _agent, branch) =>
    branch.endsWith("isis") ? { merge: { kind: "merged" }, uncommitted: true } : { merge: { kind: "conflict", files: ["a.ts"] }, uncommitted: false },
  );
  expect(await mergeMission("chef")).toBe(
    "Branche openvibe/auth :\nIsis : fusionné (des changements non commités de son worktree ne sont pas fusionnés)\nHorus : conflit, fusion annulée — a.ts",
  );
  expect(vi.mocked(missionMerge).mock.calls.map(([mission, agent, branch]) => [mission, agent, branch])).toEqual([
    ["C:/w/auth", "C:/w/isis", "openvibe/auth-isis"],
    ["C:/w/auth", "C:/w/n1", "openvibe/auth-n1"],
  ]);
  expect(missionNow().members.map((m) => m.merged === true)).toEqual([true, false, false]);
});

it("cleans a finished mission and frees the orchestrator for the next, its settings kept", async () => {
  await setup({ state: "terminee", budgetMin: 90, maxAgents: 3, project: "C:/code/proj", slug: "auth", summary: "ok", members: [member("isis", "Isis", true)] });
  vi.mocked(missionCleanup).mockResolvedValue({ removed: ["auth-isis", "auth"], kept: [] });
  expect(await cleanMission("chef")).toEqual({ removed: ["auth-isis", "auth"], kept: [] });
  expect(missionCleanup).toHaveBeenCalledWith("C:/code/proj", "auth", ["Isis"]);
  expect(missionNow()).toEqual({ state: "redaction", budgetMin: 90, maxAgents: 3, members: [] });
});
