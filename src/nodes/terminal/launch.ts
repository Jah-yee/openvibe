import type { Preset, ShellKind, SpawnSpec } from "@/ipc/pty";
import type { TerminalPayload } from "@/nodes/types";

/** How "Relancer" starts a Claude terminal (spec §5.3); other presets ignore it. */
export type LaunchMode = "new" | "resume" | "continue";

export const PRESET_LABELS: Record<Preset, string> = {
  claude: "Claude Code",
  aider: "Aider",
  codex: "Codex",
  shell: "Shell",
  custom: "Personnalisé",
};

export const SHELL_LABELS: Record<ShellKind, string> = {
  default: "Par défaut",
  powershell: "PowerShell",
  pwsh: "PowerShell 7",
  cmd: "Invite de commandes",
  gitbash: "Git Bash",
};

/** "Claude Code · openvibe": the preset and the last folder of the working directory. */
export function defaultTitle(preset: Preset, cwd: string): string {
  const folder = cwd.split(/[\\/]/).filter(Boolean).pop();
  return folder ? `${PRESET_LABELS[preset]} · ${folder}` : PRESET_LABELS[preset];
}

export interface LaunchInput {
  title: string;
  cwd: string;
  preset: Preset;
  command: string;
  shell: ShellKind;
}

/** The payload of a new terminal; a Claude terminal gets its own conversation id. */
export function newTerminalPayload(input: LaunchInput): TerminalPayload {
  const title = input.title.trim() || defaultTitle(input.preset, input.cwd);
  const payload: TerminalPayload = { ...input, title, command: input.command.trim() };
  if (input.preset === "claude") payload.claudeSessionId = crypto.randomUUID();
  return payload;
}

export function buildSpawnSpec(payload: TerminalPayload, mode: LaunchMode): SpawnSpec {
  const spec: SpawnSpec = {
    cwd: payload.cwd,
    shell: payload.shell,
    preset: payload.preset,
    command: payload.command,
  };
  if (payload.preset === "claude") {
    spec.claude = { mode, sessionId: payload.claudeSessionId ?? crypto.randomUUID(), title: payload.title };
  }
  return spec;
}
