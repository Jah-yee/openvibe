import type { Preset, ShellKind } from "@/ipc/pty";

/** Content of a terminal node (spec §8.3). */
export interface TerminalPayload {
  title: string;
  cwd: string;
  preset: Preset;
  /** Used by the "custom" preset only. */
  command: string;
  shell: ShellKind;
  /** The Claude Code conversation of this node, for `--session-id` / `--resume`. */
  claudeSessionId?: string;
}

/** Plan 3 adds the note, kanban and git payloads. */
export type NodePayload = TerminalPayload;
