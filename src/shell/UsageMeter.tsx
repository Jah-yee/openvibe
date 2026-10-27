import type { ReactNode } from "react";
import { BUDGET_COLOR } from "@/canvas/overlay/timeline";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AGENTS } from "@/fleet/catalog";
import { formatDuration } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { sessionOf, useNodes } from "@/store/nodes";
import { currentLimit, formatUsd, limitTone, totals, type Limit, type Limits } from "@/usage/usage";
import { useUsage } from "@/usage/usageStore";

/** « 67,8 k », « 1,2 M » tokens. */
function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(".", ",")} k`;
  return String(count);
}

/** « 03:50 » today, « lun. 08:00 » another day. */
function formatWhen(ms: number, now: number): string {
  const date = new Date(ms);
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === new Date(now).toDateString() ? time : `${date.toLocaleDateString("fr-FR", { weekday: "short" })} ${time}`;
}

function Bar({ limit, wide = false }: { limit: Limit; wide?: boolean }) {
  const tone = limitTone(limit.usedPercent);
  return (
    <span data-tone={tone} className={wide ? "block h-1.5 w-full rounded-full bg-ov-line" : "block h-1 w-8 rounded-full bg-ov-line"}>
      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, limit.usedPercent)}%`, backgroundColor: BUDGET_COLOR[tone] }} />
    </span>
  );
}

/**
 * The title bar's usage (spec maj §6): the plan's session and week, from
 * Claude's status lines; the detail of this run's sessions on a click.
 */
/** The limits as of now: a window past its reset shows as reset (final review maj §6). */
function useCurrentLimits(): Limits | null {
  const limits = useUsage((s) => s.limits);
  const now = useNow(60_000);
  if (!limits) return null;
  return {
    ...limits,
    fiveHour: limits.fiveHour && currentLimit(limits.fiveHour, now),
    sevenDay: limits.sevenDay && currentLimit(limits.sevenDay, now),
    models: limits.models.map((m) => ({ ...m, limit: currentLimit(m.limit, now) })),
  };
}

export function UsageMeter() {
  const limits = useCurrentLimits();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-usage
          title={limits ? "Usage de ton abonnement Claude · clic pour le détail" : "L'usage s'affiche après la première réponse d'un agent Claude lancé par OpenVibe"}
          className="flex h-6 items-center gap-2 rounded-[6px] px-1.5 font-mono text-[11.5px] text-ov-text-2 hover:bg-ov-hover hover:text-ov-text"
        >
          {!limits?.fiveHour && !limits?.sevenDay ? (
            "Usage"
          ) : (
            <>
              {limits.fiveHour && (
                <span className="flex items-center gap-1">
                  Session {Math.round(limits.fiveHour.usedPercent)} %<Bar limit={limits.fiveHour} />
                </span>
              )}
              {limits.sevenDay && (
                <span className="flex items-center gap-1">
                  Semaine {Math.round(limits.sevenDay.usedPercent)} %<Bar limit={limits.sevenDay} />
                </span>
              )}
              {limits.models.map((m) => (
                <span key={m.key} className="flex items-center gap-1">
                  {m.label} {Math.round(m.limit.usedPercent)} %<Bar limit={m.limit} />
                </span>
              ))}
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px]">
        <UsageDetail />
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <p className="ov-label">{title}</p>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-ov-text-2">{label}</span>
      <span className="ml-auto text-right font-mono text-ov-text">{children}</span>
    </div>
  );
}

function LimitRow({ label, limit, now }: { label: string; limit: Limit; now: number }) {
  return (
    <div className="flex flex-col gap-1">
      <Row label={label}>
        {Math.round(limit.usedPercent)} %{limit.resetsAt ? ` · repart à ${formatWhen(limit.resetsAt, now)}` : ""}
      </Row>
      <Bar limit={limit} wide />
    </div>
  );
}

function UsageDetail() {
  const limits = useCurrentLimits();
  const sessions = useUsage((s) => s.sessions);
  const nodes = useNodes((s) => s.nodes);
  const now = useNow(30_000);
  const list = Object.values(sessions);
  const sum = totals(list);
  const fable = limits?.models.find((m) => m.label === "Fable");
  const nameOf = (nodeId: string) => {
    const session = sessionOf(nodes[nodeId]);
    return session ? session.name || AGENTS[session.agent].label : "Session fermée";
  };
  return (
    <div data-usage-detail className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
      <Section title="Limites de l'abonnement">
        {limits?.fiveHour ? <LimitRow label="Session (5 h)" limit={limits.fiveHour} now={now} /> : <Row label="Session (5 h)">—</Row>}
        {limits?.sevenDay ? <LimitRow label="Semaine (tous modèles)" limit={limits.sevenDay} now={now} /> : <Row label="Semaine (tous modèles)">—</Row>}
        {fable ? (
          <LimitRow label="Semaine (Fable)" limit={fable.limit} now={now} />
        ) : (
          <Row label="Semaine (Fable)">
            <span className="font-sans text-ov-text-3" title="Claude Code ne la donne pas aux lignes d'état ; /usage l'affiche dans un terminal Claude.">
              non transmise
            </span>
          </Row>
        )}
        {limits?.models
          .filter((m) => m.label !== "Fable")
          .map((m) => (
            <LimitRow key={m.key} label={`Semaine (${m.label})`} limit={m.limit} now={now} />
          ))}
      </Section>
      <Section title={`Sessions d'OpenVibe depuis son ouverture · ${sum.sessions}`}>
        <Row label="Coût total">{formatUsd(sum.costUsd)}</Row>
        <Row label="Durée API">{formatDuration(sum.apiMs)}</Row>
        <Row label="Durée réelle">{formatDuration(sum.wallMs)}</Row>
        <Row label="Code">
          <span style={{ color: "var(--ov-ok)" }}>+{sum.linesAdded}</span> <span style={{ color: "var(--ov-danger)" }}>−{sum.linesRemoved}</span>
        </Row>
        <Row label={<span title="Estimation : facteurs de claude-carbon (Jegham et al. 2025), ordre de grandeur">CO₂ (estimation)</span>}>
          {sum.co2Grams < 10 ? sum.co2Grams.toFixed(1).replace(".", ",") : Math.round(sum.co2Grams)} g
        </Row>
      </Section>
      {sum.byModel.length > 0 && (
        <Section title="Par modèle">
          {sum.byModel.map((m) => (
            <Row key={m.name} label={m.name}>
              {formatUsd(m.costUsd)} · {formatTokens(m.inputTokens)} entrée · {formatTokens(m.outputTokens)} sortie
            </Row>
          ))}
        </Section>
      )}
      {list.some((s) => s.cache) && (
        <Section title="Cache de prompt">
          {list
            .filter((s) => s.cache)
            .map((s) => (
              <Row key={s.sessionId} label={`${nameOf(s.nodeId)} · ${s.model?.name ?? ""}`}>
                {s.cache!.warm && (s.cache!.expiresAt === null || s.cache!.expiresAt > now)
                  ? `chaud${s.cache!.hitRatio !== null ? ` · ${Math.round(s.cache!.hitRatio * 100)} %` : ""}${s.cache!.expiresAt ? ` · jusqu'à ${formatWhen(s.cache!.expiresAt, now)}` : ""}`
                  : "froid"}
              </Row>
            ))}
        </Section>
      )}
      <p className="text-[10.5px] text-ov-text-3">Lu dans la ligne d'état de chaque session Claude lancée par OpenVibe ; ta propre ligne d'état s'affiche toujours.</p>
    </div>
  );
}
