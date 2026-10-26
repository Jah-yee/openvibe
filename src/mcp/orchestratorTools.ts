import { pauseAgents } from "@/fleet/broadcast";
import { ptySendText } from "@/ipc/pty";
import { endMission, mergeMission } from "@/mission/launch";
import { NEW_AGENT, oneLine, proposedPlan, remainingGlobal, sameName, spentMin, type Member, type Mission } from "@/mission/mission";
import { agentState, linkedClaudeAgents, missionOf, orchestratorShown, setMission, updateMember } from "@/mission/store";
import { terminalText } from "@/nodes/terminal/registry";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore, terminalOf } from "@/store/nodes";
import { isRunning } from "@/store/terminalStatus";
import { refused, said, type ToolResult } from "./agentTools";

const NO_ARGS = { type: "object", properties: {} } as const;

/** The orchestrator's tools (spec orchestrateur §7.2; `prolonger`, `interrompre`, `reattribuer` come with H3). */
export const ORCHESTRATOR_TOOLS = [
  {
    name: "mission",
    description: "La mission : état, nom, tâche, budget global, nombre maximal d'agents, branche, plan, et les agents Claude reliés disponibles.",
    inputSchema: NO_ARGS,
  },
  {
    name: "proposer_plan",
    description: "Propose ton plan : il remplace le plan en attente et attend le feu vert de l'utilisateur (« Lancer la mission » dans le panneau). Une sous-tâche par agent.",
    inputSchema: {
      type: "object",
      properties: {
        nom: { type: "string", maxLength: 60, description: "Nom court de la mission ; il nomme sa branche." },
        tache: { type: "string", description: "La tâche de l'utilisateur, résumée." },
        sous_taches: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              titre: { type: "string", maxLength: 60 },
              consigne: { type: "string" },
              agent: { type: "string", description: "Prénom d'un agent Claude relié, ou « nouveau »." },
              budget_min: { type: "integer", minimum: 1 },
            },
            required: ["titre", "consigne", "agent", "budget_min"],
          },
        },
      },
      required: ["nom", "tache", "sous_taches"],
    },
  },
  {
    name: "equipe",
    description: "Chaque agent de la mission : sous-tâche, état (travaille, attend, inactif, arrêté), étapes, temps passé / budget, compte rendu.",
    inputSchema: NO_ARGS,
  },
  {
    name: "lire_sortie",
    description: "La fin du terminal d'un agent de la mission, en texte simple.",
    inputSchema: { type: "object", properties: { agent: { type: "string" }, lignes: { type: "integer", minimum: 1, maximum: 200 } }, required: ["agent"] },
  },
  {
    name: "ecrire",
    description: "Tape un message dans le terminal d'un agent de la mission (relance, précision). Refusé s'il attend une réponse de l'utilisateur.",
    inputSchema: { type: "object", properties: { agent: { type: "string" }, texte: { type: "string" } }, required: ["agent", "texte"] },
  },
  {
    name: "prolonger",
    description: "Ajoute des minutes au budget d'un agent de la mission, prises sur le reste du budget global.",
    inputSchema: { type: "object", properties: { agent: { type: "string" }, minutes: { type: "integer", minimum: 1 } }, required: ["agent", "minutes"] },
  },
  {
    name: "interrompre",
    description: "Arrête le tour d'un agent au travail (Échap), comme « Pause » ; ecrire « continue » le reprend.",
    inputSchema: { type: "object", properties: { agent: { type: "string" } }, required: ["agent"] },
  },
  {
    name: "reattribuer",
    description: "Donne une sous-tâche à un autre agent de la mission qui a rendu compte, ou à un agent « nouveau » : il la reçoit avec le compte rendu et la branche du précédent.",
    inputSchema: { type: "object", properties: { sous_tache: { type: "string" }, agent: { type: "string" } }, required: ["sous_tache", "agent"] },
  },
  {
    name: "fusionner",
    description: "Fusionne dans la branche de la mission les branches des agents qui ont rendu compte « termine » ; dit ce qui est fusionné et les conflits.",
    inputSchema: NO_ARGS,
  },
  {
    name: "terminer",
    description: "Clôt la mission avec ton bilan : les agents créés pour elle sont fermés, les agents reliés reviennent dans le dossier du projet.",
    inputSchema: { type: "object", properties: { bilan: { type: "string" } }, required: ["bilan"] },
  },
] as const;

const AGENT_ONLY = new Set(["declarer_etapes", "etape", "rendre_compte"]);
/** The wires are only known for the workspace on screen (final review H2). */
const HIDDEN_AGENTS = "inconnus : l'espace de l'orchestrateur n'est pas affiché";
const json = (value: unknown) => said(JSON.stringify(value, null, 2));
/** « d'Isis », « de Horus ». */
const of = (name: string) => (/^[aeiouyéèêàâîôûh]/i.test(name) && !/^h[aeiouy]/i.test(name) ? `d'${name}` : `de ${name}`);
const formed = (mission: Mission) => mission.state === "en_cours" || mission.state === "terminee";

function memberNamed(mission: Mission, raw: unknown): Member | string {
  if (!formed(mission)) return "L'équipe n'est pas encore formée.";
  const name = typeof raw === "string" ? raw : "";
  return mission.members.find((m) => sameName(m.name, name)) ?? `« ${name} » n'est pas un agent de la mission.`;
}

function describeMission(orchestratorId: string, mission: Mission): ToolResult {
  const team = new Set(mission.members.map((m) => m.nodeId));
  return json({
    etat: mission.state,
    nom: mission.name ?? null,
    tache: mission.task ?? null,
    budget_global_min: mission.budgetMin ?? null,
    agents_max: mission.maxAgents,
    branche: mission.branch ?? null,
    plan: mission.plan?.map((s) => ({ titre: s.title, consigne: s.brief, agent: s.agent, budget_min: s.budgetMin })) ?? null,
    agents_relies: orchestratorShown(orchestratorId)
      ? linkedClaudeAgents(orchestratorId)
          .filter((a) => !team.has(a.nodeId))
          .map((a) => ({ prenom: a.name, etat: agentState(a.nodeId) }))
      : HIDDEN_AGENTS,
    erreur: mission.error ?? null,
  });
}

function proposePlan(orchestratorId: string, mission: Mission, args: Record<string, unknown>): ToolResult {
  if (mission.state === "lancement" || mission.state === "en_cours") return refused("Une mission est déjà en cours : termine-la avant d'en proposer une autre.");
  if (mission.state === "terminee") return refused("La mission est terminée : l'utilisateur la nettoie depuis le panneau, puis tu pourras proposer un nouveau plan.");
  const named = Array.isArray(args.sous_taches) && args.sous_taches.some((s) => !sameName(String((s as Record<string, unknown> | null)?.agent ?? ""), NEW_AGENT));
  if (named && !orchestratorShown(orchestratorId)) {
    return refused("L'espace de l'orchestrateur n'est pas affiché : je ne vois pas ses agents reliés. Propose des agents « nouveau », ou réessaie quand l'utilisateur y revient.");
  }
  const result = proposedPlan(args, mission, linkedClaudeAgents(orchestratorId).map((a) => a.name));
  if (typeof result === "string") return refused(result);
  setMission(orchestratorId, { state: "plan", ...result, error: undefined });
  const n = result.plan.length;
  return said(`Plan proposé : ${n} sous-tâche${n > 1 ? "s" : ""}. Il attend le feu vert de l'utilisateur (« Lancer la mission » dans le panneau de l'orchestrateur).`);
}

function describeTeam(mission: Mission): ToolResult {
  if (!formed(mission)) return refused("L'équipe n'est pas encore formée.");
  const nodes = nodesStore.getState().nodes;
  const minutes = (at: number | undefined) => (at === undefined ? 0 : Math.floor((Date.now() - at) / 60_000));
  return json(
    mission.members.map((m) => ({
      prenom: m.name,
      sous_tache: m.task,
      etat: agentState(m.nodeId),
      etapes: terminalOf(nodes[m.nodeId])?.steps?.map((s) => `${s.title} : ${s.state}`) ?? [],
      temps: `${minutes(m.sentAt)} / ${m.budgetMin} min`,
      branche: m.branch,
      compte_rendu: m.report ? { statut: m.report.status, resume: m.report.summary } : null,
      fusionne: m.merged === true,
    })),
  );
}

function readOutput(mission: Mission, args: Record<string, unknown>): ToolResult {
  const member = memberNamed(mission, args.agent);
  if (typeof member === "string") return refused(member);
  const lines = typeof args.lignes === "number" ? Math.min(200, Math.max(1, Math.floor(args.lignes))) : 50;
  return said(terminalText(member.nodeId, lines) || "(terminal vide)");
}

async function write(mission: Mission, args: Record<string, unknown>): Promise<ToolResult> {
  const member = memberNamed(mission, args.agent);
  if (typeof member === "string") return refused(member);
  const text = typeof args.texte === "string" ? oneLine(args.texte) : "";
  if (!text) return refused("Rien à écrire (texte).");
  if (!isRunning(member.nodeId)) return refused(`${member.name} est arrêté.`);
  if (agentActivityStore.getState().activities[member.nodeId]?.activity === "waiting") {
    return refused(`${member.name} attend une réponse de l'utilisateur : ce dialogue est pour lui, signale-le-lui.`);
  }
  await ptySendText(member.nodeId, text);
  return said(`Écrit à ${member.name}.`);
}

function prolong(orchestratorId: string, mission: Mission, args: Record<string, unknown>): ToolResult {
  if (mission.state !== "en_cours") return refused("Aucune mission en cours.");
  const member = memberNamed(mission, args.agent);
  if (typeof member === "string") return refused(member);
  const minutes = args.minutes;
  if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 1) return refused("Donne un nombre entier de minutes (1 au moins).");
  const left = remainingGlobal(mission);
  if (left !== undefined && minutes > left) return refused(`Il reste ${Math.max(0, left)} min sur le budget global.`);
  const extraMin = (member.extraMin ?? 0) + minutes;
  const budget = member.budgetMin + extraMin;
  const spent = spentMin(member, Date.now());
  // Below its new budget it may be told again later; still past it, it is not told twice (spec §8.2).
  const overdue = spent >= 2 * budget ? 2 : spent >= budget ? 1 : undefined;
  updateMember(orchestratorId, member.nodeId, { extraMin, overdue });
  return said(`${member.name} : +${minutes} min, budget ${budget} min.`);
}

async function interrupt(mission: Mission, args: Record<string, unknown>): Promise<ToolResult> {
  const member = memberNamed(mission, args.agent);
  if (typeof member === "string") return refused(member);
  // The same as « Pause »: « Tout reprendre » knows it.
  if ((await pauseAgents([member.nodeId])) === 0) return refused(`${member.name} n'est pas au travail : rien à interrompre.`);
  return said(`Tour ${of(member.name)} interrompu. ecrire « continue » le reprend.`);
}

function finish(orchestratorId: string, mission: Mission, args: Record<string, unknown>): ToolResult {
  if (mission.state !== "en_cours") return refused("Aucune mission en cours.");
  const summary = typeof args.bilan === "string" ? args.bilan.trim() : "";
  if (!summary) return refused("Donne ton bilan (bilan).");
  endMission(orchestratorId, summary);
  return said("Mission terminée. Le bilan est dans le panneau ; l'utilisateur fusionne la branche de la mission dans la sienne.");
}

/** One call of the orchestrator; it acts on its own mission only (spec orchestrateur §4.3). */
export async function orchestratorTool(orchestratorId: string, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const mission = missionOf(nodesStore.getState().nodes[orchestratorId]);
  if (!mission) return refused("Cet orchestrateur n'est plus sur le canvas.");
  switch (name) {
    case "mission":
      return describeMission(orchestratorId, mission);
    case "proposer_plan":
      return proposePlan(orchestratorId, mission, args);
    case "equipe":
      return describeTeam(mission);
    case "lire_sortie":
      return readOutput(mission, args);
    case "ecrire":
      return write(mission, args);
    case "prolonger":
      return prolong(orchestratorId, mission, args);
    case "interrompre":
      return mission.state === "en_cours" ? interrupt(mission, args) : refused("Aucune mission en cours.");
    case "fusionner":
      return mission.state === "en_cours" ? said(await mergeMission(orchestratorId)) : refused("Aucune mission en cours.");
    case "terminer":
      return finish(orchestratorId, mission, args);
    default:
      return refused(AGENT_ONLY.has(name) ? "Outil réservé aux agents." : `Outil inconnu : ${name}`);
  }
}
