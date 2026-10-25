import { showNode } from "@/canvas/arrive";
import { focusGroup } from "@/canvas/canvasFocus";
import { canvasStore } from "@/canvas/canvasStore";
import { groupOf, type SceneGroup } from "@/canvas/groups";
import { setAgentsFilter, setAgentsPanel } from "@/fleet/agentsPanelState";
import { canPause, canResume, pauseAgents, resumeAgent, type AgentFacts } from "@/fleet/broadcast";
import { AGENTS } from "@/fleet/catalog";
import { requestCloseGroup, ungroup } from "@/fleet/groups";
import { orchestrateGroup } from "@/fleet/orchestrators";
import { duplicateTerminal, requestClose } from "@/fleet/terminals";
import type { TerminalPayload } from "@/nodes/types";
import { relaunchTerminal, stopTerminal } from "@/nodes/terminal/registry";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore, terminalOf } from "@/store/nodes";
import { isRunning } from "@/store/terminalStatus";
import { uiStore } from "@/store/ui";
import type { Command, CommandContext } from "../command";
import { requestUi } from "../uiRequests";

/** The terminal of the moment (spec fenêtre §7.3): the one that had the keyboard when the palette opened. */
function payloadOf(ctx: CommandContext): TerminalPayload | undefined {
  return ctx.project && ctx.terminalId ? terminalOf(nodesStore.getState().nodes[ctx.terminalId]) : undefined;
}

function groupOfCurrent(ctx: CommandContext): SceneGroup | null {
  return payloadOf(ctx) && ctx.terminalId ? groupOf(canvasStore.getState().frames, ctx.terminalId) : null;
}

function factsOf(ctx: CommandContext): AgentFacts | null {
  const payload = payloadOf(ctx);
  if (!payload || !ctx.terminalId) return null;
  return { agent: payload.agent, running: isRunning(ctx.terminalId), activity: agentActivityStore.getState().activities[ctx.terminalId]?.activity };
}

const hasTerminal = (ctx: CommandContext) => payloadOf(ctx) !== undefined;
const hasGroup = (ctx: CommandContext) => groupOfCurrent(ctx) !== null;
// `available` guarantees both before `run`.
const terminalId = (ctx: CommandContext) => ctx.terminalId as string;
const groupId = (ctx: CommandContext) => (groupOfCurrent(ctx) as SceneGroup).id;

function terminalSection(ctx: CommandContext): string {
  const payload = payloadOf(ctx);
  return `Terminal · ${payload ? payload.name || AGENTS[payload.agent].label : ""}`;
}

const groupSection = (ctx: CommandContext) => `Groupe · ${groupOfCurrent(ctx)?.name ?? ""}`;

export const CURRENT: readonly Command[] = [
  {
    id: "terminal.rename",
    label: "Renommer",
    section: terminalSection,
    keywords: ["nom", "prénom", "terminal"],
    available: hasTerminal,
    // The view moves if needed, without the keyboard: the name editor takes it.
    run: (ctx) => {
      showNode(terminalId(ctx));
      requestUi({ kind: "renameTerminal", id: terminalId(ctx) });
    },
  },
  {
    id: "terminal.duplicate",
    label: "Dupliquer",
    section: terminalSection,
    keywords: ["copie", "dupliquer", "terminal"],
    available: hasTerminal,
    run: async (ctx) => {
      if (ctx.workspaceId) await duplicateTerminal(ctx.workspaceId, terminalId(ctx));
    },
  },
  {
    id: "terminal.relaunch",
    label: "Relancer",
    section: terminalSection,
    keywords: ["relancer", "redémarrer", "reprendre"],
    available: hasTerminal,
    // Claude resumes its session, other agents start anew (plan F2, décision 2).
    run: (ctx) => {
      const payload = payloadOf(ctx) as TerminalPayload;
      relaunchTerminal(terminalId(ctx), payload, payload.agent === "claude" && payload.claudeSessionId ? "resume" : "new");
    },
  },
  {
    id: "terminal.stop",
    label: "Arrêter le processus",
    section: terminalSection,
    keywords: ["arrêter", "tuer", "processus"],
    available: (ctx) => hasTerminal(ctx) && isRunning(terminalId(ctx)),
    run: (ctx) => stopTerminal(terminalId(ctx)),
  },
  {
    id: "terminal.pause",
    label: "Mettre en pause",
    section: terminalSection,
    keywords: ["pause", "interrompre"],
    available: (ctx) => {
      const facts = factsOf(ctx);
      return facts !== null && canPause(facts);
    },
    run: async (ctx) => {
      await pauseAgents([terminalId(ctx)]);
    },
  },
  {
    id: "terminal.resume",
    label: "Reprendre",
    section: terminalSection,
    keywords: ["reprendre", "continuer"],
    available: (ctx) => {
      const facts = factsOf(ctx);
      return facts !== null && canResume(facts);
    },
    run: async (ctx) => {
      await resumeAgent(terminalId(ctx));
    },
  },
  {
    id: "terminal.close",
    label: "Fermer",
    section: terminalSection,
    keywords: ["fermer", "terminal"],
    available: hasTerminal,
    run: (ctx) => requestClose(terminalId(ctx)),
  },
  {
    id: "group.rename",
    label: "Renommer le groupe",
    section: groupSection,
    keywords: ["groupe", "nom"],
    available: hasGroup,
    // Its label edits the name: the group comes into view first.
    run: (ctx) => {
      const id = groupId(ctx);
      focusGroup(id);
      requestAnimationFrame(() => uiStore.getState().setRenamingGroup(id));
    },
  },
  {
    id: "group.addAgent",
    label: "Ajouter un agent…",
    section: groupSection,
    keywords: ["groupe", "agent", "ajouter"],
    available: hasGroup,
    // The group's menu, in the agents panel (plan F2, décision 4).
    run: (ctx) => {
      setAgentsFilter("all");
      setAgentsPanel(true);
      requestUi({ kind: "groupMenu", id: groupId(ctx) });
    },
  },
  {
    id: "group.orchestrate",
    label: "Relier un orchestrateur",
    section: groupSection,
    keywords: ["orchestrateur", "relier", "groupe"],
    available: hasGroup,
    run: async (ctx) => {
      await orchestrateGroup(groupId(ctx));
    },
  },
  { id: "group.ungroup", label: "Dégrouper", section: groupSection, keywords: ["groupe", "dégrouper"], available: hasGroup, run: (ctx) => ungroup(groupId(ctx)) },
  { id: "group.close", label: "Fermer le groupe", section: groupSection, keywords: ["groupe", "fermer"], available: hasGroup, run: (ctx) => requestCloseGroup(groupId(ctx)) },
];
