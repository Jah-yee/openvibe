import { mcpReply, onMcpCall, type McpCall } from "@/ipc/mcp";
import { nodesStore, terminalOf } from "@/store/nodes";
import { AGENT_TOOLS, declareSteps, markStep, refused, report } from "./agentTools";

/** The interface's answer to one MCP call of a node (spec orchestrateur §4.1, §4.3). */
export async function answer(call: McpCall): Promise<unknown> {
  if (call.method === "tools/list") return { tools: AGENT_TOOLS };
  const name = String(call.params.name ?? "");
  const args = (call.params.arguments ?? {}) as Record<string, unknown>;
  if (!terminalOf(nodesStore.getState().nodes[call.nodeId])) return refused("Ce terminal n'est plus sur le canvas.");
  switch (name) {
    case "declarer_etapes":
      return declareSteps(call.nodeId, args);
    case "etape":
      return markStep(call.nodeId, args);
    case "rendre_compte":
      return report();
    default:
      return refused(`Outil inconnu : ${name}`);
  }
}

/** For the app's whole life: every call gets an answer, a failure included. */
export async function installMcp() {
  await onMcpCall(async (call) => {
    let result: unknown;
    try {
      result = await answer(call);
    } catch (error) {
      result = refused(`OpenVibe n'a pas pu répondre : ${String(error)}`);
    }
    await mcpReply(call.callId, result);
  });
}
