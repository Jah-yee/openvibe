import type { TerminalPayload } from "@/nodes/types";

/** A new agent copying another: same agent, folder and shell; its own name and conversation. */
export function cloneTerminalPayload(source: TerminalPayload, name: string): TerminalPayload {
  const copy: TerminalPayload = { ...source, name };
  delete copy.claudeSessionId;
  // Its steps belong to the source's conversation (spec orchestrateur §5).
  delete copy.steps;
  // A mission's model and Remote Control were asked for the source only (final review maj §3).
  delete copy.model;
  delete copy.remoteControl;
  if (copy.agent === "claude") copy.claudeSessionId = crypto.randomUUID();
  return copy;
}
