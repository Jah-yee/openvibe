import { setAgentsPanel } from "@/fleet/agentsPanelState";
import { agentsStore } from "@/fleet/agentsStore";
import { pauseAll, resumeAll, workspaceTerminalIds } from "@/fleet/broadcast";
import { AGENTS } from "@/fleet/catalog";
import { launchAt, launchFour, newConsole, placeOrchestrator } from "@/fleet/quickActions";
import type { AgentId } from "@/ipc/pty";
import type { Command } from "../command";
import { requestUi } from "../uiRequests";
import { inProject } from "./navigation";

/** The agents of « Lancer … », in the spec's order (spec fenêtre §7.3). */
const LAUNCHED: readonly AgentId[] = ["claude", "codex", "gemini", "qwen", "cursor", "opencode", "aider", "ollama", "shell"];

/** Like the Agent menu: an agent not found on this computer is listed greyed, with why. */
const notFound = (agent: AgentId) => () =>
  agentsStore.getState().agents.some((a) => a.id === agent && a.available) ? null : `${AGENTS[agent].binary} introuvable dans le PATH`;

export const AGENT_COMMANDS: readonly Command[] = [
  ...LAUNCHED.map(
    (agent): Command => ({
      id: `agent.launch.${agent}`,
      // Ollama starts on a model: its menu opens on them (plan F2, décision 1).
      label: agent === "ollama" ? "Lancer Ollama…" : `Lancer ${AGENTS[agent].label}`,
      section: "Agents",
      keywords: [AGENTS[agent].label, AGENTS[agent].vendor, "agent", "lancer"],
      available: inProject,
      disabled: notFound(agent),
      run: () => (agent === "ollama" ? requestUi({ kind: "agentMenu", view: "ollama" }) : launchAt(agent)),
    }),
  ),
  {
    id: "agent.custom",
    label: "Lancer un agent personnalisé…",
    section: "Agents",
    keywords: ["commande", "personnalisé", "agent"],
    available: inProject,
    run: () => requestUi({ kind: "agentMenu", view: "options" }),
  },
  { id: "agent.console", label: "Nouvelle console", section: "Agents", keywords: ["console", "terminal"], available: inProject, run: () => newConsole() },
  { id: "agent.four", label: "Lancer 4 agents", section: "Agents", keywords: ["quatre", "groupe", "agents"], available: inProject, run: () => launchFour() },
  { id: "agent.orchestrator", label: "Orchestrateur", section: "Agents", keywords: ["orchestrateur", "chef"], available: inProject, run: () => placeOrchestrator() },
  {
    id: "group.compose",
    label: "Composer un groupe…",
    section: "Agents",
    keywords: ["groupe", "composer", "rôle"],
    available: inProject,
    // Its window is anchored in the agents panel (plan F2, décision 4).
    run: () => {
      setAgentsPanel(true);
      requestUi({ kind: "composeGroup" });
    },
  },
  {
    id: "agents.pauseAll",
    label: "Tout mettre en pause",
    section: "Agents",
    keywords: ["pause", "interrompre", "tout"],
    available: inProject,
    run: async () => {
      await pauseAll(workspaceTerminalIds());
    },
  },
  {
    id: "agents.resumeAll",
    label: "Tout reprendre",
    section: "Agents",
    keywords: ["reprendre", "continuer", "tout"],
    available: inProject,
    run: async () => {
      await resumeAll(workspaceTerminalIds());
    },
  },
];
