import {
  Asterisk,
  Bot,
  Code,
  Cpu,
  Hexagon,
  MousePointer2,
  Sparkle,
  SquareCode,
  SquareTerminal,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { AGENT_IDS, type AgentId, type AgentInfo } from "@/ipc/pty";

export interface AgentMeta {
  label: string;
  vendor: string;
  /** Border and logo color of the agent's terminals (spec habillage §8). */
  tint: string;
  /** The program looked for on the PATH ("" for shell and custom). */
  binary: string;
  Icon: LucideIcon;
}

export const AGENTS: Record<AgentId, AgentMeta> = {
  claude: { label: "Claude", vendor: "Anthropic", tint: "#e8603a", binary: "claude", Icon: Asterisk },
  codex: { label: "Codex", vendor: "OpenAI", tint: "#707de3", binary: "codex", Icon: SquareTerminal },
  gemini: { label: "Gemini", vendor: "Google", tint: "#5c86e0", binary: "gemini", Icon: Sparkle },
  qwen: { label: "Qwen Code", vendor: "Alibaba", tint: "#a57be0", binary: "qwen", Icon: Hexagon },
  cursor: { label: "Cursor", vendor: "cursor-agent", tint: "#d4d4cc", binary: "cursor-agent", Icon: MousePointer2 },
  opencode: { label: "OpenCode", vendor: "sst", tint: "#77b7c0", binary: "opencode", Icon: Code },
  aider: { label: "Aider", vendor: "aider", tint: "#86a174", binary: "aider", Icon: Bot },
  ollama: { label: "Ollama", vendor: "modèle local", tint: "#ede8df", binary: "ollama", Icon: Cpu },
  shell: { label: "Shell", vendor: "par défaut", tint: "#8a8a80", binary: "", Icon: Terminal },
  custom: { label: "Personnalisé", vendor: "commande", tint: "#8a8a80", binary: "", Icon: SquareCode },
};

export const AGENT_ORDER: AgentId[] = [...AGENT_IDS];

/** Agents that start without options: Ollama needs a model, Personnalisé a command. */
export const AGENTS_WITHOUT_OPTIONS = AGENT_ORDER.filter((id) => id !== "ollama" && id !== "custom");

/** The agent of "Nouvelle console": the first available of Claude, Codex, Shell. */
export function defaultAgent(agents: readonly AgentInfo[]): AgentId {
  for (const id of ["claude", "codex"] as const) {
    if (agents.some((agent) => agent.id === id && agent.available)) return id;
  }
  return "shell";
}
