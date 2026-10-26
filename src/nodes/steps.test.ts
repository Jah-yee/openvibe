import { describe, expect, it } from "vitest";
import { declaredSteps, markedSteps, readSteps } from "./steps";
import { readTerminalPayload } from "./types";

describe("an agent's steps (spec orchestrateur §4.4, §5)", () => {
  it("declares 1 to 12 short titles, all to come", () => {
    expect(declaredSteps([" Plan ", "Recherche"])).toEqual([
      { title: "Plan", state: "a_venir" },
      { title: "Recherche", state: "a_venir" },
    ]);
    expect(declaredSteps(["x".repeat(50)])).toEqual([{ title: "x".repeat(40), state: "a_venir" }]);
    expect(declaredSteps([])).toBe("Donne entre 1 et 12 étapes.");
    expect(declaredSteps(Array.from({ length: 13 }, (_, i) => `É${i}`))).toBe("Donne entre 1 et 12 étapes.");
    expect(declaredSteps(["Plan", 3])).toBe("Chaque étape est un titre court.");
    expect(declaredSteps(["Plan", "  "])).toBe("Chaque étape est un titre court.");
    expect(declaredSteps("Plan")).toBe("Donne entre 1 et 12 étapes.");
  });

  it("marks a step by its title, adding an unknown one at the end", () => {
    const steps = declaredSteps(["Plan", "Code"]) as ReturnType<typeof readSteps> & object;
    expect(markedSteps(steps, "plan", "fait")).toEqual([
      { title: "Plan", state: "fait" },
      { title: "Code", state: "a_venir" },
    ]);
    expect(markedSteps(steps, "Tests", "en_cours")).toEqual([...steps, { title: "Tests", state: "en_cours" }]);
    expect(markedSteps(steps, "Plan", "fini")).toBe("État inconnu : fini (en_cours, fait ou echec).");
    expect(markedSteps([], "Plan", "fait")).toEqual([{ title: "Plan", state: "fait" }]);
    expect(markedSteps(steps, "", "fait")).toBe("Chaque étape est un titre court.");
  });

  it("keeps the steps a terminal saved, drops what it cannot read", () => {
    const base = { title: "", name: "Isis", agent: "claude", cwd: "C:/code", shell: "default", command: "" };
    expect(readTerminalPayload({ ...base, steps: [{ title: "Plan", state: "fait" }] })?.steps).toEqual([{ title: "Plan", state: "fait" }]);
    expect(readTerminalPayload({ ...base, steps: [{ title: "Plan", state: "?" }] })?.steps).toBeUndefined();
    expect(readTerminalPayload(base)?.steps).toBeUndefined();
  });
});
