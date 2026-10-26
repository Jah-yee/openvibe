import type { TerminalPayload } from "@/nodes/types";

/** A new agent copying another: same agent, folder and shell; its own name and conversation. */
export function cloneTerminalPayload(source: TerminalPayload, name: string): TerminalPayload {
  const copy: TerminalPayload = { ...source, name };
  delete copy.claudeSessionId;
  // Its steps belong to the source's conversation (spec orchestrateur §5).
  delete copy.steps;
  if (copy.agent === "claude") copy.claudeSessionId = crypto.randomUUID();
  return copy;
}
