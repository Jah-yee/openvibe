import { useRef, useState } from "react";
import { ChevronDown, Network, X } from "lucide-react";
import { useCanvas } from "@/canvas/canvasStore";
import { useUiRequest } from "@/commands/uiRequests";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentRow } from "@/fleet/AgentRow";
import { pauseAll, resumeAll } from "@/fleet/broadcast";
import { AGENTS } from "@/fleet/catalog";
import { CommandInput } from "@/fleet/CommandInput";
import { agentsText, countsText, groupsText } from "@/fleet/groupSummary";
import { removeOrchestrator, renameOrchestrator } from "@/fleet/orchestrators";
import { ROLES } from "@/fleet/roles";
import { targetAgents } from "@/fleet/targets";
import { linkedAgents, NO_LINKS } from "@/fleet/wires";
import { useNativeKeyDown } from "@/lib/useNativeKeyDown";
import { useActivities } from "@/store/agentActivity";
import { terminalOf, useNodes } from "@/store/nodes";
import { uiStore, useUi } from "@/store/ui";
import { frameStyle } from "../terminal/frame";
import { HeaderButton } from "../terminal/TerminalHeader";

/** A node that commands the groups and terminals wired to it (spec habillage §13). */
export function OrchestratorNode({ nodeId }: { nodeId: string }) {
  const record = useNodes((s) => s.nodes[nodeId]);
  const nodes = useNodes((s) => s.nodes);
  const links = useCanvas((s) => s.links[nodeId] ?? NO_LINKS);
  const frames = useCanvas((s) => s.frames);
  const selected = useCanvas((s) => s.view.selectedIds.includes(nodeId));
  const linking = useUi((s) => s.linking === nodeId);
  const activities = useActivities();

  if (record?.kind !== "orchestrator") {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-ov-line bg-ov-surface text-sm text-ov-text-2">
        Orchestrateur introuvable
      </div>
    );
  }

  const linked = linkedAgents(links, frames);
  const working = (ids: readonly string[]) => ids.filter((id) => activities[id]?.activity === "working").length;
  const nameOf = (id: string) => {
    const payload = terminalOf(nodes[id]);
    return payload ? payload.name || AGENTS[payload.agent].label : undefined;
  };
  const agents = targetAgents(linked.agentIds, nameOf, frames);
  const count = linked.agentIds.length;

  return (
    <div
      data-orchestrator={nodeId}
      className="flex h-full flex-col overflow-hidden rounded-xl bg-ov-surface-2"
      style={frameStyle("var(--ov-accent)", selected, false)}
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-ov-line px-3">
        <Network className="size-4 shrink-0 text-ov-accent" />
        <NameField nodeId={nodeId} value={record.payload.name} onCommit={(name) => renameOrchestrator(nodeId, name)} />
        <span className="ml-auto flex items-center gap-1 font-mono text-[11px] text-ov-text-2" title="Agents en activité / agents reliés">
          <ProgressRing value={working(linked.agentIds)} total={count} />
          {working(linked.agentIds)}/{count}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menu de l'orchestrateur"
              className="grid size-5 place-items-center rounded text-ov-text-2 hover:bg-ov-card hover:text-ov-text"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => void pauseAll(linked.agentIds)}>Tout mettre en pause</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void resumeAll(linked.agentIds)}>Tout reprendre</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <HeaderButton label="Fermer l'orchestrateur" onClick={() => removeOrchestrator(nodeId)}>
          <X />
        </HeaderButton>
      </header>
      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-xs text-ov-text-2">
        <span>
          {agentsText(count)} · {groupsText(linked.groups.length)}
        </span>
        <button
          type="button"
          onClick={() => uiStore.getState().setLinking(linking ? null : nodeId)}
          className="rounded-full bg-ov-accent px-2.5 py-0.5 text-[11px] font-semibold text-white hover:brightness-110"
        >
          {linking ? "Terminer" : "+ Relier"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {count === 0 && <p className="py-6 text-center text-xs text-ov-text-2">Relie un groupe ou un agent avec « + Relier »</p>}
        {linked.groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-1 pb-2">
            <header className="flex items-center gap-1.5 px-1 text-[11px]">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: group.group ? ROLES[group.group.role].color : "var(--ov-idle)" }} />
              <span className="font-semibold uppercase tracking-[0.08em] text-ov-text">{group.name}</span>
              <span className="ml-auto font-mono text-ov-text-2">{countsText(group.memberIds.length, working(group.memberIds))}</span>
            </header>
            {group.memberIds.map((id) => (
              <AgentRow key={id} id={id} showCenter />
            ))}
          </section>
        ))}
        {linked.directIds.map((id) => (
          <AgentRow key={id} id={id} showCenter />
        ))}
      </div>
      <footer className="shrink-0 border-t border-ov-line p-2">
        <CommandInput
          compact
          agents={agents}
          groups={linked.groups}
          fallback={linked.agentIds}
          placeholder={`Commander ${agentsText(count)} · @ pour cibler…`}
          emptyHint="Relie des agents à cet orchestrateur"
        />
      </footer>
    </div>
  );
}

/** The orchestrator's name; a double-click edits it, Enter or a click elsewhere keeps it, Escape cancels. */
function NameField({ nodeId, value, onCommit }: { nodeId: string; value: string; onCommit: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  // « Renommer » of the orchestrator's radial menu.
  useUiRequest("renameOrchestrator", (request) => {
    if (request.id !== nodeId) return false;
    setEditing(true);
    return true;
  });
  if (!editing) {
    return (
      <span className="truncate text-[13px] font-semibold text-ov-text" onDoubleClick={() => setEditing(true)} title="Double-clic pour renommer">
        {value}
      </span>
    );
  }
  return (
    <NameInput
      initial={value}
      onDone={(name) => {
        if (name !== null) onCommit(name);
        setEditing(false);
      }}
    />
  );
}

/** Mounted while editing, so its key listener finds the field. */
function NameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [draft, setDraft] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  useNativeKeyDown(input, (e) => {
    if (e.key === "Enter") input.current?.blur();
    if (e.key === "Escape") {
      cancelled.current = true;
      onDone(null);
    }
  });
  return (
    <input
      ref={input}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (!cancelled.current) onDone(draft);
      }}
      className="w-36 rounded bg-ov-card px-1 text-[13px] font-semibold text-ov-text outline-none"
    />
  );
}

/** `◌ 3/8`: the share of wired agents at work. */
function ProgressRing({ value, total }: { value: number; total: number }) {
  const radius = 5;
  const length = 2 * Math.PI * radius;
  const done = total > 0 ? (value / total) * length : 0;
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 -rotate-90">
      <circle cx="7" cy="7" r={radius} fill="none" stroke="var(--ov-line)" strokeWidth="2" />
      <circle cx="7" cy="7" r={radius} fill="none" stroke="var(--ov-working)" strokeWidth="2" strokeDasharray={`${done} ${length}`} />
    </svg>
  );
}
