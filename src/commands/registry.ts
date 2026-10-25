import { arrive } from "@/canvas/arrive";
import { overview, releaseToCanvas } from "@/canvas/canvasFocus";
import { canvasStore } from "@/canvas/canvasStore";
import { lastTerminalOf, terminalWithKeyboard } from "@/canvas/keyboardFocus";
import { stepTerminal, terminalOrder } from "@/canvas/terminalOrder";
import { nodesStore } from "@/store/nodes";
import { projectsStore } from "@/store/projects";
import { workspacesStore } from "@/store/workspaces";
import type { Command, CommandContext } from "./command";
import { openPalette } from "./paletteState";

const inProject = (ctx: CommandContext) => ctx.project;
const withTerminals = (ctx: CommandContext) => ctx.project && ctx.terminalCount > 0;

/** Ctrl+Tab and Ctrl+Maj+Tab (spec fenêtre §6.3): the next terminal in reading order, then the arrival (§6.4). */
function step(direction: 1 | -1, ctx: CommandContext) {
  const api = canvasStore.getState().api;
  if (!api) return;
  const target = stepTerminal(terminalOrder(api.getSceneElements()), ctx.terminalId, direction);
  if (target) arrive(target);
}

/** The application's functions (spec fenêtre §7.3); the palette (J8) adds its own. */
export const COMMANDS: readonly Command[] = [
  {
    id: "terminal.next",
    label: "Terminal suivant",
    section: "Navigation",
    keywords: ["suivant", "terminal", "agent"],
    shortcut: "Ctrl+Tab",
    available: withTerminals,
    run: (ctx) => step(1, ctx),
  },
  {
    id: "terminal.previous",
    label: "Terminal précédent",
    section: "Navigation",
    keywords: ["précédent", "terminal", "agent"],
    shortcut: "Ctrl+Maj+Tab",
    available: withTerminals,
    run: (ctx) => step(-1, ctx),
  },
  {
    id: "canvas.release",
    label: "Rendre la main au canvas",
    section: "Navigation",
    keywords: ["canvas", "clavier", "dessin"],
    shortcut: "Maj+Échap",
    available: inProject,
    run: () => releaseToCanvas(),
  },
  {
    id: "canvas.overview",
    label: "Vue d'ensemble",
    section: "Navigation",
    keywords: ["ensemble", "tout", "voir", "agents"],
    shortcut: "Ctrl+Maj+A",
    available: inProject,
    run: () => overview(),
  },
  {
    id: "palette.goTo",
    label: "Aller à…",
    section: "Navigation",
    keywords: ["chercher", "rechercher", "terminal", "groupe", "workspace", "projet"],
    shortcut: "Ctrl+P",
    available: () => true,
    run: (ctx) => openPalette("goTo", ctx),
  },
  {
    id: "palette.functions",
    label: "Rechercher une fonction…",
    section: "Navigation",
    keywords: ["fonction", "commande", "action"],
    shortcut: "Ctrl+Maj+P",
    available: () => true,
    run: (ctx) => openPalette("functions", ctx),
  },
];

/** The context of a command, read at this moment from the stores and the keyboard focus. */
export function commandContext(): CommandContext {
  const project =
    projectsStore.getState().view === "project" &&
    workspacesStore.getState().status === "ready" &&
    canvasStore.getState().api !== null;
  if (!project) return { project: false, workspaceId: null, terminalCount: 0, terminalId: null };
  const workspaceId = workspacesStore.getState().activeId;
  const nodes = nodesStore.getState().nodes;
  const terminals = canvasStore.getState().nodeIds.filter((id) => nodes[id]?.kind === "terminal");
  const remembered = workspaceId ? lastTerminalOf(workspaceId) : null;
  const terminalId = terminalWithKeyboard() ?? (remembered && terminals.includes(remembered) ? remembered : null);
  return { project, workspaceId, terminalCount: terminals.length, terminalId };
}
