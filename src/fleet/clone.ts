import type { TerminalPayload } from "@/nodes/types";

/** A new agent copying another: same agent, folder and shell; its own name and conversation. */
export function cloneTerminalPayload(source: TerminalPayload, name: string): TerminalPayload {
  const copy: TerminalPayload = { ...source, name };
  delete copy.claudeSessionId;
  if (copy.agent === "claude") copy.claudeSessionId = crypto.randomUUID();
  return copy;
}
