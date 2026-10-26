import { AGENT_IDS, type AgentId, type OllamaLaunch, type ShellKind } from "@/ipc/pty";
import { readSteps, type Step } from "./steps";

/** Content of a terminal node (spec habillage §15.2). */
export interface TerminalPayload {
  /** Full title: tooltip of the header, and the session name given to Claude. */
  title: string;
  /** Mythological first name shown in the header ("" until one is given). */
  name: string;
  agent: AgentId;
  cwd: string;
  shell: ShellKind;
  /** Used by the "custom" agent only. */
  command: string;
  /** The Claude Code conversation of this node, for `--session-id` / `--resume`. */
  claudeSessionId?: string;
  ollama?: OllamaLaunch;
  /** The steps its agent declared (spec orchestrateur §5). */
  steps?: Step[];
}

/** Content of an orchestrator node (spec habillage §13, §15.2). */
export interface OrchestratorPayload {
  name: string;
}

export const ORCHESTRATOR_NAME = "Orchestrateur";

export type NodePayload = TerminalPayload | OrchestratorPayload;

/** Reads a stored orchestrator payload; a missing or blank name becomes "Orchestrateur". */
export function readOrchestratorPayload(raw: unknown): OrchestratorPayload {
  const name = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).name : undefined;
  return { name: typeof name === "string" && name.trim() ? name : ORCHESTRATOR_NAME };
}

const SHELLS = new Set<string>(["default", "powershell", "pwsh", "cmd", "gitbash"]);

/**
 * Reads a stored terminal payload, including those saved before agents and names
 * existed (`preset` instead of `agent`, no `name`). Null when it cannot be launched.
 */
export function readTerminalPayload(raw: unknown): TerminalPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const agent = typeof r.agent === "string" ? r.agent : r.preset;
  if (typeof agent !== "string" || !(AGENT_IDS as readonly string[]).includes(agent) || typeof r.cwd !== "string") {
    return null;
  }
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const payload: TerminalPayload = {
    title: text(r.title),
    name: text(r.name),
    agent: agent as AgentId,
    cwd: r.cwd,
    shell: (typeof r.shell === "string" && SHELLS.has(r.shell) ? r.shell : "default") as ShellKind,
    command: text(r.command),
  };
  if (typeof r.claudeSessionId === "string") payload.claudeSessionId = r.claudeSessionId;
  const ollama = r.ollama as Record<string, unknown> | undefined;
  if (ollama && typeof ollama.model === "string" && (ollama.mode === "chat" || ollama.mode === "code")) {
    payload.ollama = { model: ollama.model, mode: ollama.mode };
  }
  const steps = readSteps(r.steps);
  if (steps) payload.steps = steps;
  return payload;
}
