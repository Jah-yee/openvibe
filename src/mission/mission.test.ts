import { describe, expect, it } from "vitest";
import { NEW_MISSION, oneLine, proposedPlan, readMission, sameName, type Mission } from "./mission";

const task = (agent: string, budget = 20) => ({ titre: "Login", consigne: "Fais le login", agent, budget_min: budget });
const args = (...sous_taches: object[]) => ({ nom: "Auth", tache: "Ajoute l'authentification", sous_taches });

describe("proposedPlan (spec orchestrateur §7.2)", () => {
  it("takes a plan of linked agents, named case and accents aside, and new ones", () => {
    const result = proposedPlan(args(task("athena"), { ...task("nouveau", 30), titre: "API" }), NEW_MISSION, ["Athéna", "Apollon"]);
    expect(result).toEqual({
      name: "Auth",
      task: "Ajoute l'authentification",
      plan: [
        { title: "Login", brief: "Fais le login", agent: "Athéna", budgetMin: 20 },
        { title: "API", brief: "Fais le login", agent: "nouveau", budgetMin: 30 },
      ],
    });
  });

  it("refuses what the team cannot do, with a reason the orchestrator can read", () => {
    const budgeted: Mission = { ...NEW_MISSION, budgetMin: 30, maxAgents: 2 };
    expect(proposedPlan(args(task("Zeus")), NEW_MISSION, ["Athéna"])).toContain("Zeus");
    expect(proposedPlan(args(task("Athéna"), task("Athéna")), NEW_MISSION, ["Athéna"])).toContain("une sous-tâche par agent");
    expect(proposedPlan(args(task("nouveau", 20), task("nouveau", 20)), budgeted, [])).toContain("budget global");
    expect(proposedPlan(args(task("nouveau"), task("nouveau"), task("nouveau")), budgeted, [])).toContain("2 sous-tâches");
    expect(proposedPlan(args(task("nouveau", 0)), NEW_MISSION, [])).toContain("budget");
    expect(proposedPlan({ tache: "x", sous_taches: [task("nouveau")] }, NEW_MISSION, [])).toContain("nom");
    expect(proposedPlan(args(), NEW_MISSION, [])).toContain("au moins une");
  });
});

describe("readMission", () => {
  it("reads a saved mission back; a launch cut short by a restart is back to its plan", () => {
    const saved = { state: "lancement", maxAgents: 3, name: "Auth", plan: [{ title: "Login", brief: "b", agent: "nouveau", budgetMin: 5 }], members: [] };
    expect(readMission(saved)).toEqual({ ...saved, state: "plan" });
    const member = { nodeId: "n1", name: "Isis", task: "Login", budgetMin: 5, linked: false, branch: "openvibe/auth-isis", worktree: "C:/w", sentAt: 4, report: { summary: "ok", status: "termine", at: 9 } };
    expect(readMission({ state: "en_cours", maxAgents: 4, members: [member, { nodeId: 3 }] })?.members).toEqual([member]);
  });

  it("drops what is not a mission", () => {
    expect(readMission({ state: "partie" })).toBeUndefined();
    expect(readMission("x")).toBeUndefined();
  });
});

it("compares names case and accents aside, and keeps typed text on one line", () => {
  expect(sameName(" HÉRA", "hera")).toBe(true);
  expect(sameName("Héra", "Hermès")).toBe(false);
  expect(oneLine("Fais ceci\r\n\n  puis cela ")).toBe("Fais ceci puis cela");
});
