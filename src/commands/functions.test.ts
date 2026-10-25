import { describe, expect, it } from "vitest";
import { labelOf, sectionOf, type Command, type CommandContext } from "./command";
import { functionSections } from "./functions";

const ctx: CommandContext = { project: true, workspaceId: "w1", terminalCount: 1, terminalId: null };
const command = (id: string, label: string, section: string, available = true): Command => ({
  id,
  label,
  section,
  keywords: [],
  available: () => available,
  run: () => undefined,
});

describe("functionSections (spec fenêtre §7.3)", () => {
  const commands = [
    command("terminal.next", "Terminal suivant", "Navigation"),
    command("workspace.new", "Nouveau workspace", "Workspaces"),
    command("terminal.pause", "Mettre en pause", "Terminal · Isis", false),
    command("canvas.overview", "Vue d'ensemble", "Navigation"),
    command("palette.functions", "Rechercher une fonction…", "Navigation"),
  ];

  it("lists the available functions by section, in the registry's order, without itself", () => {
    expect(functionSections(commands, ctx, "").map((s) => [s.label, s.items.map((c) => c.label)])).toEqual([
      ["Navigation", ["Terminal suivant", "Vue d'ensemble"]],
      ["Workspaces", ["Nouveau workspace"]],
    ]);
  });

  it("names a line and its section after the moment, shows its key, and why it is greyed", () => {
    const rename: Command = {
      id: "terminal.rename",
      label: (c) => `Renommer ${c.terminalId}`,
      section: (c) => `Terminal · ${c.terminalId}`,
      keywords: [],
      keys: "F2",
      available: () => true,
      run: () => undefined,
    };
    const codex: Command = {
      id: "agent.launch.codex",
      label: "Lancer Codex",
      section: "Agents",
      keywords: [],
      available: () => true,
      disabled: () => "codex introuvable dans le PATH",
      run: () => undefined,
    };
    const sections = functionSections([rename, codex], { ...ctx, terminalId: "Isis" }, "");
    expect(sections.map((s) => s.label)).toEqual(["Terminal · Isis", "Agents"]);
    expect(sections[0].items[0]).toMatchObject({ label: "Renommer Isis", hint: "F2", disabled: null });
    expect(sections[1].items[0]).toMatchObject({ label: "Lancer Codex", hint: null, disabled: "codex introuvable dans le PATH" });
    expect(labelOf(rename, { ...ctx, terminalId: "Thot" })).toBe("Renommer Thot");
    expect(sectionOf(codex, ctx)).toBe("Agents");
  });

  it("ranks each section by the search", () => {
    expect(functionSections(commands, ctx, "ens").map((s) => [s.label, s.items.map((c) => c.label)])).toEqual([["Navigation", ["Vue d'ensemble", "Terminal suivant"]]]);
  });
});
