// @vitest-environment happy-dom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { nodesStore, terminalOf } from "@/store/nodes";
import { answer } from "./router";
import { ptySendText } from "@/ipc/pty";
import { terminalText } from "@/nodes/terminal/registry";
import { notify } from "@/mission/events";
import { endMission } from "@/mission/launch";
import { missionOf, setMission, updateMember } from "@/mission/store";
import { workspacesStore } from "@/store/workspaces";
import { agentActivityStore } from "@/store/agentActivity";
import { terminalStatusStore } from "@/store/terminalStatus";

vi.mock("@/ipc/pty", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/ipc/pty")>()), ptySendText: vi.fn(() => Promise.resolve()) }));
vi.mock("@/nodes/terminal/registry", () => ({ terminalText: vi.fn(() => "ligne 1\nligne 2") }));
vi.mock("@/mission/launch", () => ({ mergeMission: vi.fn(() => Promise.resolve("Branche openvibe/auth :\nIsis : fusionné")), endMission: vi.fn() }));
vi.mock("@/mission/events", () => ({ notify: vi.fn() }));
vi.mock("@/mission/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/mission/store")>()),
  linkedClaudeAgents: vi.fn(() => [{ nodeId: "isis", name: "Isis" }]),
}));

vi.mock("@excalidraw/excalidraw", () => ({}));

const call = (nodeId: string, name: string, args: Record<string, unknown>) =>
  answer({ callId: 1, nodeId, method: "tools/call", params: { name, arguments: args } });
const textOf = (result: unknown) => (result as { content: { text: string }[] }).content[0].text;

beforeAll(async () => {
  mockIPC(() => undefined);
  workspacesStore.setState({ activeId: "w1" });
  await nodesStore.getState().create("isis", {
    workspaceId: "w1",
    kind: "terminal",
    payload: { title: "", name: "Isis", agent: "claude", cwd: "C:/code", shell: "default", command: "" },
  });
  await nodesStore.getState().create("chef", { workspaceId: "w1", kind: "orchestrator", payload: { name: "chef" } });
});

describe("the agent's tools (spec orchestrateur §4.4)", () => {
  it("lists them for any Claude session", async () => {
    const list = (await answer({ callId: 1, nodeId: "isis", method: "tools/list", params: {} })) as { tools: { name: string; inputSchema: object }[] };
    expect(list.tools.map((t) => t.name)).toEqual(["declarer_etapes", "etape", "rendre_compte"]);
    expect(list.tools.every((t) => typeof t.inputSchema === "object")).toBe(true);
  });

  it("declares and marks the terminal's steps, saved in its payload", async () => {
    expect(textOf(await call("isis", "declarer_etapes", { etapes: ["Plan", "Code"] }))).toBe("2 étapes déclarées.");
    expect(textOf(await call("isis", "etape", { titre: "Plan", etat: "fait" }))).toBe("Plan : fait.");
    expect(terminalOf(nodesStore.getState().nodes.isis)?.steps).toEqual([
      { title: "Plan", state: "fait" },
      { title: "Code", state: "a_venir" },
    ]);
  });

  it("answers mistakes with a readable error, the payload untouched", async () => {
    const before = terminalOf(nodesStore.getState().nodes.isis)?.steps;
    const wrong = (await call("isis", "etape", { titre: "Plan", etat: "fini" })) as { isError?: boolean };
    expect(wrong.isError).toBe(true);
    expect((await call("isis", "declarer_etapes", {})) as { isError?: boolean }).toMatchObject({ isError: true });
    // Final review H1: a long title is refused before anything changes, not after.
    expect((await call("isis", "etape", { titre: "Implémentation du middleware d'authentification", etat: "fait" })) as { isError?: boolean }).toMatchObject({ isError: true });
    expect(textOf(await call("isis", "voler", {}))).toBe("Outil inconnu : voler");
    expect(textOf(await call("gone", "etape", { titre: "Plan", etat: "fait" }))).toBe("Ce terminal n'est plus sur le canvas.");
    expect(textOf(await call("chef", "etape", { titre: "Plan", etat: "fait" }))).toBe("Outil réservé aux agents.");
    expect(terminalOf(nodesStore.getState().nodes.isis)?.steps).toEqual(before);
  });

  it("says there is no mission to report to, outside one", async () => {
    expect(textOf(await call("isis", "rendre_compte", { resume: "Fait", statut: "termine" }))).toBe("Pas de mission en cours : rien à transmettre.");
  });
});

describe("the orchestrator's tools (spec orchestrateur §7.2)", () => {
  const plan = {
    nom: "Auth",
    tache: "Ajoute l'authentification",
    sous_taches: [
      { titre: "Login", consigne: "Fais le login", agent: "isis", budget_min: 20 },
      { titre: "API", consigne: "Fais l'API", agent: "nouveau", budget_min: 30 },
    ],
  };

  it("lists them for the orchestrator only, and each side refuses the other's", async () => {
    const list = (await answer({ callId: 1, nodeId: "chef", method: "tools/list", params: {} })) as { tools: { name: string }[] };
    expect(list.tools.map((t) => t.name)).toEqual(["mission", "proposer_plan", "equipe", "lire_sortie", "ecrire", "fusionner", "terminer"]);
    expect(textOf(await call("isis", "proposer_plan", plan))).toBe("Outil réservé à l'orchestrateur.");
    expect(textOf(await call("chef", "rendre_compte", { resume: "x", statut: "termine" }))).toBe("Outil réservé aux agents.");
  });

  it("takes a plan that waits for the go-ahead, and describes it in mission()", async () => {
    const wrong = await call("chef", "proposer_plan", { ...plan, sous_taches: [{ ...plan.sous_taches[0], agent: "Zeus" }] });
    expect(wrong).toMatchObject({ isError: true });
    expect(missionOf(nodesStore.getState().nodes.chef)?.state).toBe("redaction");
    expect(textOf(await call("chef", "proposer_plan", plan))).toBe(
      "Plan proposé : 2 sous-tâches. Il attend le feu vert de l'utilisateur (« Lancer la mission » dans le panneau de l'orchestrateur).",
    );
    expect(JSON.parse(textOf(await call("chef", "mission", {})))).toMatchObject({
      etat: "plan",
      nom: "Auth",
      agents_max: 4,
      plan: [{ titre: "Login", agent: "Isis" }, { titre: "API", agent: "nouveau" }],
      agents_relies: [{ prenom: "Isis" }],
    });
  });

  it("says so when its workspace is not on screen, instead of finding no linked agent (final review H2)", async () => {
    await nodesStore.getState().create("loin", { workspaceId: "w9", kind: "orchestrator", payload: { name: "Loin" } });
    expect(JSON.parse(textOf(await call("loin", "mission", {}))).agents_relies).toBe("inconnus : l'espace de l'orchestrateur n'est pas affiché");
    expect(textOf(await call("loin", "proposer_plan", plan))).toContain("n'est pas affiché");
    expect(textOf(await call("loin", "proposer_plan", { ...plan, sous_taches: [plan.sous_taches[1]] }))).toContain("Plan proposé : 1 sous-tâche.");
  });

  describe("once the team is formed", () => {
    beforeAll(() =>
      setMission("chef", {
        state: "en_cours",
        branch: "openvibe/auth",
        members: [{ nodeId: "isis", name: "Isis", task: "Login", budgetMin: 20, linked: true, branch: "openvibe/auth-isis", worktree: "C:/w/isis", sentAt: Date.now() }],
      }),
    );

    it("reports the team and reads an agent's terminal", async () => {
      expect(JSON.parse(textOf(await call("chef", "equipe", {})))).toEqual([
        expect.objectContaining({ prenom: "Isis", sous_tache: "Login", temps: "0 / 20 min", compte_rendu: null, fusionne: false }),
      ]);
      expect(textOf(await call("chef", "lire_sortie", { agent: "ISIS", lignes: 2 }))).toBe("ligne 1\nligne 2");
      expect(terminalText).toHaveBeenCalledWith("isis", 2);
      expect(await call("chef", "lire_sortie", { agent: "Zeus" })).toMatchObject({ isError: true });
    });

    it("writes to an agent that runs, never into a dialog meant for the user", async () => {
      terminalStatusStore.getState().set("isis", { state: "stopped" });
      expect(textOf(await call("chef", "ecrire", { agent: "Isis", texte: "Relance" }))).toBe("Isis est arrêté.");
      terminalStatusStore.getState().set("isis", { state: "running" });
      agentActivityStore.getState().apply({ nodeId: "isis", activity: "waiting", since: 0 });
      expect(await call("chef", "ecrire", { agent: "Isis", texte: "Relance" })).toMatchObject({ isError: true });
      agentActivityStore.getState().apply({ nodeId: "isis", activity: "idle", since: 0 });
      expect(textOf(await call("chef", "ecrire", { agent: "Isis", texte: "Relance\nles tests" }))).toBe("Écrit à Isis.");
      expect(ptySendText).toHaveBeenCalledWith("isis", "Relance les tests");
    });

    it("takes an agent's report to its orchestrator", async () => {
      expect(await call("isis", "rendre_compte", { resume: "Fait", statut: "fini" })).toMatchObject({ isError: true });
      expect(textOf(await call("isis", "rendre_compte", { resume: "Login fait", statut: "termine" }))).toBe("Compte rendu transmis à l'orchestrateur.");
      expect(missionOf(nodesStore.getState().nodes.chef)?.members[0].report).toMatchObject({ summary: "Login fait", status: "termine" });
      expect(notify).toHaveBeenCalledWith("chef", "Isis a rendu compte (termine) : Login fait");
    });

    it("keeps an agent's merged branch merged when it reports again (final review H2)", async () => {
      updateMember("chef", "isis", { merged: true });
      await call("isis", "rendre_compte", { resume: "Vérifié", statut: "termine" });
      expect(missionOf(nodesStore.getState().nodes.chef)?.members[0]).toMatchObject({ merged: true, report: { summary: "Vérifié" } });
    });

    it("merges and ends the mission through OpenVibe; no new plan meanwhile", async () => {
      expect(textOf(await call("chef", "fusionner", {}))).toBe("Branche openvibe/auth :\nIsis : fusionné");
      expect(await call("chef", "proposer_plan", plan)).toMatchObject({ isError: true });
      expect(await call("chef", "terminer", {})).toMatchObject({ isError: true });
      expect(textOf(await call("chef", "terminer", { bilan: "Fini" }))).toContain("Mission terminée");
      expect(endMission).toHaveBeenCalledWith("chef", "Fini");
    });
  });
});
