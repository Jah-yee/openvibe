import { declaredSteps, markedSteps, MAX_STEPS } from "@/nodes/steps";
import { notify } from "@/mission/events";
import { oneLine } from "@/mission/mission";
import { memberOf, updateMember } from "@/mission/store";
import { nodesStore, terminalOf } from "@/store/nodes";

/** What a tool answers: MCP text content, an error the agent can read. */
export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export const said = (text: string): ToolResult => ({ content: [{ type: "text", text }] });
export const refused = (text: string): ToolResult => ({ ...said(text), isError: true });

/** The tools of any Claude session (spec orchestrateur §4.4). */
export const AGENT_TOOLS = [
  {
    name: "declarer_etapes",
    description: "Déclare les étapes de ta tâche, dans l'ordre (titres courts). OpenVibe les montre en frise sous ton terminal. Remplace les étapes déjà déclarées.",
    inputSchema: {
      type: "object",
      properties: { etapes: { type: "array", items: { type: "string", maxLength: 40 }, minItems: 1, maxItems: MAX_STEPS } },
      required: ["etapes"],
    },
  },
  {
    name: "etape",
    description: "Marque une étape : en_cours quand tu la commences, fait quand elle est finie, echec si elle échoue. Une étape inconnue s'ajoute à la fin.",
    inputSchema: {
      type: "object",
      properties: { titre: { type: "string" }, etat: { type: "string", enum: ["en_cours", "fait", "echec"] } },
      required: ["titre", "etat"],
    },
  },
  {
    name: "rendre_compte",
    description: "Rends compte de ta sous-tâche de mission à l'orchestrateur : un résumé et un statut.",
    inputSchema: {
      type: "object",
      properties: { resume: { type: "string" }, statut: { type: "string", enum: ["termine", "bloque", "echec"] } },
      required: ["resume", "statut"],
    },
  },
] as const;

export function declareSteps(nodeId: string, args: Record<string, unknown>): ToolResult {
  const steps = declaredSteps(args.etapes);
  if (typeof steps === "string") return refused(steps);
  nodesStore.getState().update(nodeId, { steps });
  return said(`${steps.length} étape${steps.length > 1 ? "s" : ""} déclarée${steps.length > 1 ? "s" : ""}.`);
}

export function markStep(nodeId: string, args: Record<string, unknown>): ToolResult {
  const current = terminalOf(nodesStore.getState().nodes[nodeId])?.steps ?? [];
  const steps = markedSteps(current, args.titre, args.etat);
  if (typeof steps === "string") return refused(steps);
  nodesStore.getState().update(nodeId, { steps });
  const step = steps.find((s) => s.title.toLowerCase() === String(args.titre).trim().toLowerCase())!;
  return said(`${step.title} : ${step.state.replace("_", " ")}.`);
}

/** `rendre_compte`: outside a mission there is no one to tell; inside, its orchestrator hears it (spec §7.5). */
export function report(nodeId: string, args: Record<string, unknown>): ToolResult {
  const found = memberOf(nodeId);
  if (!found) return said("Pas de mission en cours : rien à transmettre.");
  const summary = typeof args.resume === "string" ? args.resume.trim() : "";
  const status = args.statut;
  if (!summary) return refused("Résume ton travail (resume).");
  if (status !== "termine" && status !== "bloque" && status !== "echec") return refused(`Statut inconnu : ${String(status)} (termine, bloque ou echec).`);
  // A new report after a merge brings new commits: its branch is merged again.
  updateMember(found.orchestratorId, nodeId, { report: { summary, status, at: Date.now() }, merged: false });
  notify(found.orchestratorId, `${found.member.name} a rendu compte (${status}) : ${oneLine(summary)}`);
  return said("Compte rendu transmis à l'orchestrateur.");
}
