import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "zustand";
import { useCanvas } from "@/canvas/canvasStore";
import { focusNode } from "@/canvas/focusNode";
import { formatDuration } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/nodes/terminal/StatusPill";
import { useActivities } from "@/store/agentActivity";
import { useNodes } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { AGENTS, INDIGO } from "./catalog";
import { FLEET_FILTERS, filterCounts, fleetSections, fleetStateOf, type FleetAgent, type FleetFilter } from "./fleetView";
import { countsText } from "./groupSummary";
import { requestClose } from "./terminals";

/** The fleet of the workspace on screen, by group (spec habillage §5.5); J5 adds pause and resume. */
export function FleetPanel() {
  const [filter, setFilter] = useState<FleetFilter>("all");
  const now = useNow(15_000);
  const nodeIds = useCanvas((s) => s.nodeIds);
  const frames = useCanvas((s) => s.frames);
  const nodes = useNodes((s) => s.nodes);
  const statuses = useStore(terminalStatusStore, (s) => s.statuses);
  const activities = useActivities();

  const agents: FleetAgent[] = nodeIds
    .filter((id) => nodes[id]?.kind === "terminal")
    .map((id) => {
      const payload = nodes[id].payload;
      const status = statuses[id] ?? { state: "stopped" as const };
      const state = fleetStateOf(status, activities[id]);
      return {
        id,
        name: payload.name || AGENTS[payload.agent].label,
        agent: payload.agent,
        state,
        since: state === "stopped" ? undefined : activities[id]?.since,
      };
    });
  const counts = filterCounts(agents);
  const sections = fleetSections(agents, frames, filter);

  return (
    <aside className="pointer-events-auto absolute right-[72px] top-1/2 z-30 flex max-h-[70vh] w-[300px] -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border border-ov-line bg-ov-surface-2 p-3 shadow-ov">
      <p className="ov-label">Flotte</p>
      <div className="flex flex-wrap gap-1.5">
        {FLEET_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "flex h-6 items-center gap-1 rounded-full border px-2 text-[11px]",
              id === filter ? "border-ov-accent bg-ov-accent-soft text-ov-text" : "border-ov-line text-ov-text-2 hover:text-ov-text",
            )}
          >
            {label}
            <span className="font-mono">{counts[id]}</span>
          </button>
        ))}
      </div>
      {sections.length === 0 && <p className="py-4 text-center text-xs text-ov-text-2">Aucun agent</p>}
      {sections.map((section) => (
        <section key={section.id ?? "outside"} className="flex flex-col gap-1">
          <header className="flex items-center gap-1.5 px-1 text-[11px]">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: section.color ?? "var(--ov-idle)" }} />
            <span className="font-semibold tracking-[0.08em] text-ov-text uppercase">{section.name}</span>
            <span className="ml-auto font-mono text-ov-text-2">
              {countsText(section.agents.length, section.agents.filter((a) => a.state === "working").length)}
            </span>
          </header>
          {section.agents.map((a) => {
            const meta = AGENTS[a.agent];
            return (
              <div key={a.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-ov-hover">
                <button type="button" onClick={() => focusNode(a.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-md"
                    style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`, color: meta.tint }}
                  >
                    <meta.Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ov-text">
                    {a.name} <span className="text-ov-text-2">{meta.label}</span>
                  </span>
                </button>
                <StatusPill status={statuses[a.id] ?? { state: "stopped" }} activity={activities[a.id]} indigo={meta.tint === INDIGO} />
                <span className="w-12 shrink-0 text-right font-mono text-[11px] text-ov-text-2">
                  {a.since !== undefined ? formatDuration(now - a.since) : ""}
                </span>
                <button
                  type="button"
                  title="Fermer"
                  aria-label={`Fermer ${a.name}`}
                  onClick={() => requestClose(a.id)}
                  className="hidden size-5 place-items-center rounded text-ov-text-2 hover:bg-ov-card hover:text-ov-text group-hover:grid"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </aside>
  );
}
