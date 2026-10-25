import { describe, expect, it } from "vitest";
import type { Command, CommandContext } from "./command";
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

  it("ranks each section by the search", () => {
    expect(functionSections(commands, ctx, "ens").map((s) => [s.label, s.items.map((c) => c.label)])).toEqual([["Navigation", ["Vue d'ensemble", "Terminal suivant"]]]);
  });
});
