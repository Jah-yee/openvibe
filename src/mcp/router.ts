import { mcpReply, onMcpCall, type McpCall } from "@/ipc/mcp";
import { nodesStore, terminalOf } from "@/store/nodes";
import { AGENT_TOOLS, declareSteps, markStep, refused, report } from "./agentTools";
import { ORCHESTRATOR_TOOLS, orchestratorTool } from "./orchestratorTools";

const ORCHESTRATOR_ONLY = new Set<string>(ORCHESTRATOR_TOOLS.map((t) => t.name));

/** The interface's answer to one MCP call of a node, by its kind (spec orchestrateur §4.1, §4.3). */
export async function answer(call: McpCall): Promise<unknown> {
  const record = nodesStore.getState().nodes[call.nodeId];
  const orchestrator = record?.kind === "orchestrator";
  if (call.method === "tools/list") return { tools: orchestrator ? ORCHESTRATOR_TOOLS : AGENT_TOOLS };
  const name = String(call.params.name ?? "");
  const args = (call.params.arguments ?? {}) as Record<string, unknown>;
  if (orchestrator) return orchestratorTool(call.nodeId, name, args);
  if (!terminalOf(record)) return refused("Ce terminal n'est plus sur le canvas.");
  if (ORCHESTRATOR_ONLY.has(name)) return refused("Outil réservé à l'orchestrateur.");
  switch (name) {
    case "declarer_etapes":
      return declareSteps(call.nodeId, args);
    case "etape":
      return markStep(call.nodeId, args);
    case "rendre_compte":
      return report(call.nodeId, args);
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
