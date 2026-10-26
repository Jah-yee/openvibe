import { toast } from "sonner";
import { useStore } from "zustand";
import { useCanvas } from "@/canvas/canvasStore";
import { BUDGET_COLOR } from "@/canvas/overlay/timeline";
import { linkedAgents, NO_LINKS } from "@/fleet/wires";
import { useNow } from "@/lib/useNow";
import { useActivities } from "@/store/agentActivity";
import { terminalOf, useNodes } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { uiStore, useUi } from "@/store/ui";
import { cleanMission, launchMission } from "./launch";
import { budgetBar, budgetOf, MAX_AGENTS, spentMin, type Member, type Mission, type MissionState } from "./mission";
import { LEVELS, modelLabel } from "./router";
import { agentState, missionOf, setMission } from "./store";

const STATE_LABEL: Record<MissionState, string> = {
  redaction: "en attente d'une tâche",
  plan: "plan proposé · attend le feu vert",
  lancement: "formation de l'équipe…",
  en_cours: "en cours",
  terminee: "terminée",
};

const REPORT_LABEL = { termine: "terminé", bloque: "bloqué", echec: "échec" } as const;

/** Under the orchestrator's terminal: settings, plan and go-ahead, team, summary (spec orchestrateur §6, §7). */
export function MissionPanel({ nodeId }: { nodeId: string }) {
  const mission = useNodes((s) => missionOf(s.nodes[nodeId]));
  if (!mission) return null;
  return (
    <section data-mission={nodeId} className="flex max-h-[45%] shrink-0 flex-col gap-2 overflow-y-auto border-t border-ov-line px-3 py-2 text-xs text-ov-text-2">
      <header className="flex items-center gap-2">
        <span className="font-semibold uppercase tracking-[0.08em] text-ov-text">Mission{mission.name ? ` · ${mission.name}` : ""}</span>
        <span>{STATE_LABEL[mission.state]}</span>
        {mission.branch && <span className="ml-auto truncate font-mono text-[11px]">{mission.branch}</span>}
      </header>
      {(mission.state === "redaction" || mission.state === "plan") && <Settings nodeId={nodeId} mission={mission} />}
      {mission.state === "redaction" && <p>Écris la tâche dans le terminal : l'orchestrateur proposera son plan ici.</p>}
      {mission.plan && (mission.state === "plan" || mission.state === "lancement") && <Plan nodeId={nodeId} mission={mission} />}
      {mission.error && (
        <p role="alert" className="text-ov-danger">
          {mission.error}
        </p>
      )}
      {(mission.state === "en_cours" || mission.state === "terminee") && <Team members={mission.members} />}
      {mission.state === "terminee" && <Summary nodeId={nodeId} summary={mission.summary ?? ""} />}
    </section>
  );
}

function Settings({ nodeId, mission }: { nodeId: string; mission: Mission }) {
  const linking = useUi((s) => s.linking === nodeId);
  const links = useCanvas((s) => s.links[nodeId] ?? NO_LINKS);
  const frames = useCanvas((s) => s.frames);
  const nodes = useNodes((s) => s.nodes);
  const claude = linkedAgents(links, frames).agentIds.filter((id) => terminalOf(nodes[id])?.agent === "claude").length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1">
        Budget global
        <input
          type="number"
          min={1}
          aria-label="Budget global (minutes)"
          placeholder="aucun"
          value={mission.budgetMin ?? ""}
          onChange={(e) => setMission(nodeId, { budgetMin: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) : undefined })}
          className="w-16 rounded bg-ov-field px-1 py-0.5 text-ov-text outline-none"
        />
        min
      </label>
      <label className="flex items-center gap-1">
        Agents max
        <input
          type="number"
          min={1}
          max={MAX_AGENTS}
          aria-label="Nombre maximal d'agents"
          value={mission.maxAgents}
          onChange={(e) => {
            const count = Math.round(Number(e.target.value));
            if (count >= 1) setMission(nodeId, { maxAgents: Math.min(MAX_AGENTS, count) });
          }}
          className="w-12 rounded bg-ov-field px-1 py-0.5 text-ov-text outline-none"
        />
      </label>
      <label
        className="flex items-center gap-1"
        title="Chaque agent prend le modèle du niveau de sa sous-tâche : faible Haiku 5.5, moyen Sonnet 5.5, élevé Opus 5.5, extrême Fable 5.1"
      >
        <input
          type="checkbox"
          aria-label="Routeur de modèles"
          checked={mission.router === true}
          onChange={(e) => setMission(nodeId, { router: e.target.checked || undefined })}
          className="accent-[var(--ov-accent)]"
        />
        Routeur de modèles
      </label>
      <span className="ml-auto">
        {claude} Claude relié{claude > 1 ? "s" : ""}
      </span>
      <button
        type="button"
        onClick={() => uiStore.getState().setLinking(linking ? null : nodeId)}
        className="rounded-full bg-ov-accent px-2.5 py-0.5 text-[11px] font-semibold text-white hover:brightness-110"
      >
        {linking ? "Terminer" : "+ Relier"}
      </button>
    </div>
  );
}

function Plan({ nodeId, mission }: { nodeId: string; mission: Mission }) {
  const plan = mission.plan ?? [];
  const total = plan.reduce((sum, s) => sum + s.budgetMin, 0);
  const launching = mission.state === "lancement";
  return (
    <div className="flex flex-col gap-1.5">
      {mission.task && <p className="text-ov-text">{mission.task}</p>}
      <ol className="flex flex-col gap-1">
        {plan.map((task, i) => (
          <li key={i} className="rounded bg-ov-card px-2 py-1">
            <div className="flex items-center gap-2 text-ov-text">
              <span className="font-medium">{task.title}</span>
              {task.level && (
                <span className="shrink-0 rounded-full bg-ov-field px-1.5 text-[11px] text-ov-text-2">
                  {LEVELS[task.level].label}
                  {mission.router ? ` · ${LEVELS[task.level].modelLabel}` : ""}
                </span>
              )}
              <span className="ml-auto shrink-0 font-mono text-[11px] text-ov-text-2">
                {task.agent} · {task.budgetMin} min
              </span>
            </div>
            <p className="line-clamp-2">{task.brief}</p>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px]">
          Total {total} min{mission.budgetMin ? ` / ${mission.budgetMin}` : ""}
        </span>
        <button
          type="button"
          disabled={launching}
          onClick={() => void launchMission(nodeId)}
          className="ml-auto rounded-full bg-ov-accent px-3 py-1 text-[11px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {launching ? "Lancement…" : "Lancer la mission"}
        </button>
      </div>
    </div>
  );
}

function Team({ members }: { members: readonly Member[] }) {
  // The agents' states follow their activity and their processes; their times, the clock.
  useActivities();
  const now = useNow(15_000);
  useStore(terminalStatusStore, (s) => s.statuses);
  const nodes = useNodes((s) => s.nodes);
  return (
    <ul className="flex flex-col gap-1">
      {members.map((member) => {
        const steps = terminalOf(nodes[member.nodeId])?.steps ?? [];
        const done = steps.filter((s) => s.state === "fait").length;
        return (
          <li key={member.nodeId || member.name} data-member={member.name} className="flex items-center gap-2 rounded bg-ov-card px-2 py-1">
            <span className="font-medium text-ov-text">{member.name}</span>
            <span className="min-w-0 truncate">{member.task}</span>
            {member.model && <span className="shrink-0 font-mono text-[11px]">{modelLabel(member.model)}</span>}
            <span className="ml-auto shrink-0">{agentState(member.nodeId)}</span>
            {steps.length > 0 && (
              <span className="shrink-0 font-mono text-[11px]">
                {done}/{steps.length}
              </span>
            )}
            {member.handedTo ? (
              <span className="shrink-0">→ {member.handedTo}</span>
            ) : member.sentAt !== undefined ? (
              <BudgetTime spent={spentMin(member, now)} budget={budgetOf(member)} />
            ) : null}
            {member.report && (
              <span title={member.report.summary} className="shrink-0 rounded-full bg-ov-field px-1.5 text-[11px] text-ov-text">
                {REPORT_LABEL[member.report.status]}
                {member.merged ? " · fusionné" : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** « 6 / 20 min », coloured like its bar (spec §8.3). */
function BudgetTime({ spent, budget }: { spent: number; budget: number }) {
  return (
    <span className="shrink-0 font-mono text-[11px]" style={{ color: BUDGET_COLOR[budgetBar(spent, budget).tone] }}>
      {Math.floor(spent)} / {budget} min
    </span>
  );
}

function Summary({ nodeId, summary }: { nodeId: string; summary: string }) {
  const clean = async () => {
    const result = await cleanMission(nodeId);
    if (typeof result === "string") toast.error(`Nettoyage impossible : ${result}`);
    else toast.success(`Worktrees retirés : ${result.removed.join(", ") || "aucun"}${result.kept.length ? ` · gardés : ${result.kept.join(", ")}` : ""}`);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <p className="whitespace-pre-wrap text-ov-text">{summary}</p>
      <button type="button" onClick={() => void clean()} className="self-end rounded-full border border-ov-line px-3 py-1 text-[11px] text-ov-text hover:bg-ov-card">
        Nettoyer la mission
      </button>
    </div>
  );
}
