/** The mission of an orchestrator (spec orchestrateur §7), saved in its payload. */
export type MissionState = "redaction" | "plan" | "lancement" | "en_cours" | "terminee";
export type ReportStatus = "termine" | "bloque" | "echec";

/** A sub-task of the plan; `agent` is a linked agent's name, or `nouveau`. */
export interface SubTask {
  title: string;
  brief: string;
  agent: string;
  budgetMin: number;
}

export interface Report {
  summary: string;
  status: ReportStatus;
  at: number;
}

/** An agent of the formed team, in its worktree. */
export interface Member {
  nodeId: string;
  name: string;
  /** The title of its sub-task. */
  task: string;
  budgetMin: number;
  /** Linked before the mission (back to the project at its end), else created for it (closed). */
  linked: boolean;
  branch: string;
  worktree: string;
  /** When its sub-task was typed: its events are watched from then on. */
  sentAt?: number;
  report?: Report;
  merged?: boolean;
}

export interface Mission {
  state: MissionState;
  /** Settings of the panel (spec §7.1). */
  budgetMin?: number;
  maxAgents: number;
  name?: string;
  task?: string;
  plan?: SubTask[];
  /** Set by « Lancer la mission ». */
  project?: string;
  slug?: string;
  branch?: string;
  worktree?: string;
  /** The group of the agents created for it. */
  frameId?: string;
  members: Member[];
  summary?: string;
  error?: string;
}

export const NEW_AGENT = "nouveau";
export const DEFAULT_MAX_AGENTS = 4;
export const MAX_AGENTS = 8;
export const NEW_MISSION: Mission = { state: "redaction", maxAgents: DEFAULT_MAX_AGENTS, members: [] };

const STATES: readonly string[] = ["redaction", "plan", "lancement", "en_cours", "terminee"];
const STATUSES: readonly string[] = ["termine", "bloque", "echec"];
const MAX_TITLE = 60;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const fold = (name: string) => name.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase("fr");

/** The orchestrator names agents as it reads them: case and accents aside. */
export const sameName = (a: string, b: string) => fold(a) === fold(b);

/** Text typed in a terminal ends at its first line break: briefs and messages go on one line. */
export const oneLine = (value: string) => value.replace(/\s*[\r\n]+\s*/g, " ").trim();

function readMember(raw: unknown): Member | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.nodeId !== "string" || typeof r.name !== "string" || typeof r.branch !== "string" || typeof r.worktree !== "string") return null;
  const member: Member = {
    nodeId: r.nodeId,
    name: r.name,
    task: text(r.task),
    budgetMin: typeof r.budgetMin === "number" ? r.budgetMin : 0,
    linked: r.linked === true,
    branch: r.branch,
    worktree: r.worktree,
  };
  if (typeof r.sentAt === "number") member.sentAt = r.sentAt;
  if (r.merged === true) member.merged = true;
  const report = r.report as Record<string, unknown> | undefined;
  if (report && typeof report.summary === "string" && typeof report.status === "string" && STATUSES.includes(report.status)) {
    member.report = { summary: report.summary, status: report.status as ReportStatus, at: typeof report.at === "number" ? report.at : 0 };
  }
  return member;
}

function isSubTask(raw: unknown): raw is SubTask {
  const r = raw as Record<string, unknown>;
  return typeof raw === "object" && raw !== null && typeof r.title === "string" && typeof r.brief === "string" && typeof r.agent === "string" && typeof r.budgetMin === "number";
}

/** A saved mission; undefined when absent or unreadable. A launch cut short by a restart is back to its plan. */
export function readMission(raw: unknown): Mission | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.state !== "string" || !STATES.includes(r.state)) return undefined;
  const mission: Mission = {
    state: r.state === "lancement" ? "plan" : (r.state as MissionState),
    maxAgents: typeof r.maxAgents === "number" ? r.maxAgents : DEFAULT_MAX_AGENTS,
    members: Array.isArray(r.members) ? r.members.map(readMember).filter((m): m is Member => m !== null) : [],
  };
  if (typeof r.budgetMin === "number") mission.budgetMin = r.budgetMin;
  for (const key of ["name", "task", "project", "slug", "branch", "worktree", "frameId", "summary", "error"] as const) {
    if (typeof r[key] === "string") mission[key] = r[key];
  }
  if (Array.isArray(r.plan)) mission.plan = r.plan.filter(isSubTask);
  return mission;
}

/** `proposer_plan`'s arguments as a plan, or what is wrong (spec §7.2). `linked`: names of the linked Claude agents. */
export function proposedPlan(
  args: Record<string, unknown>,
  mission: Mission,
  linked: readonly string[],
): { name: string; task: string; plan: SubTask[] } | string {
  const name = text(args.nom);
  if (!name || name.length > MAX_TITLE) return `Donne un nom court à la mission (nom, ${MAX_TITLE} caractères au plus).`;
  const task = text(args.tache);
  if (!task) return "Rappelle la tâche de la mission (tache).";
  const raw = args.sous_taches;
  if (!Array.isArray(raw) || raw.length === 0) return "Donne au moins une sous-tâche.";
  if (raw.length > mission.maxAgents) return `Pas plus de ${mission.maxAgents} sous-tâches : une par agent, ${mission.maxAgents} agents au plus.`;
  const plan: SubTask[] = [];
  for (const [i, item] of raw.entries()) {
    const r = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const n = i + 1;
    const title = text(r.titre);
    const brief = text(r.consigne);
    const agent = text(r.agent);
    const budget = r.budget_min;
    if (!title || title.length > MAX_TITLE) return `Sous-tâche ${n} : un titre court (${MAX_TITLE} caractères au plus).`;
    if (!brief) return `Sous-tâche ${n} : une consigne.`;
    if (typeof budget !== "number" || !Number.isInteger(budget) || budget < 1) return `Sous-tâche ${n} : un budget en minutes (entier, 1 au moins).`;
    const known = sameName(agent, NEW_AGENT) ? NEW_AGENT : linked.find((l) => sameName(l, agent));
    if (!known) return `Sous-tâche ${n} : « ${agent} » n'est pas un agent Claude relié (prénom, ou « nouveau »).`;
    if (known !== NEW_AGENT && plan.some((s) => s.agent === known)) return `${known} a déjà une sous-tâche : une sous-tâche par agent.`;
    plan.push({ title, brief, agent: known, budgetMin: budget });
  }
  const total = plan.reduce((sum, s) => sum + s.budgetMin, 0);
  if (mission.budgetMin !== undefined && total > mission.budgetMin) {
    return `Les budgets font ${total} min, plus que le budget global (${mission.budgetMin} min).`;
  }
  return { name, task, plan };
}
