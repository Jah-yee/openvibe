import { useEffect, useRef, useState } from "react";
import { ChevronDown, Network, X } from "lucide-react";
import { useCanvas } from "@/canvas/canvasStore";
import { useUiRequest } from "@/commands/uiRequests";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pauseAll, resumeAll } from "@/fleet/broadcast";
import { agentsText, groupsText } from "@/fleet/groupSummary";
import { defaultLaunchOptions } from "@/fleet/launchAgent";
import { removeOrchestrator, renameOrchestrator } from "@/fleet/orchestrators";
import { linkedAgents, NO_LINKS } from "@/fleet/wires";
import type { Activity } from "@/ipc/activity";
import { useNativeKeyDown } from "@/lib/useNativeKeyDown";
import { useActivity } from "@/store/agentActivity";
import { nodesStore, useNodes } from "@/store/nodes";
import { useTerminalStatus, type TerminalStatus } from "@/store/terminalStatus";
import { uiStore, useUi } from "@/store/ui";
import { frameStyle, WAITING_GLOW } from "../terminal/frame";
import { orchestratorSession } from "../terminal/launch";
import { markForAutostart } from "../terminal/registry";
import { ResumeCard } from "../terminal/ResumeCard";
import { HeaderButton } from "../terminal/TerminalHeader";
import { useTerminalHost } from "../terminal/useTerminalHost";

/** The manager of a team: its Claude session, then its mission (spec orchestrateur §6). */
export function OrchestratorNode({ nodeId }: { nodeId: string }) {
  const record = useNodes((s) => s.nodes[nodeId]);
  const links = useCanvas((s) => s.links[nodeId] ?? NO_LINKS);
  const frames = useCanvas((s) => s.frames);
  const selected = useCanvas((s) => s.view.selectedIds.includes(nodeId));
  const linking = useUi((s) => s.linking === nodeId);
  const status = useTerminalStatus(nodeId);
  const activity = useActivity(nodeId);
  const hostRef = useRef<HTMLDivElement>(null);
  const session = record?.kind === "orchestrator" ? record.payload.session : undefined;

  useEffect(() => {
    const current = nodesStore.getState().nodes[nodeId];
    // An orchestrator of before gets its session when first shown (spec orchestrateur §6).
    if (current?.kind !== "orchestrator" || current.payload.session) return;
    nodesStore.getState().update(nodeId, { session: orchestratorSession(current.payload.name, defaultLaunchOptions()) });
    markForAutostart(nodeId);
  }, [nodeId]);
  useTerminalHost(nodeId, hostRef, session !== undefined);

  if (record?.kind !== "orchestrator") {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-ov-line bg-ov-surface text-sm text-ov-text-2">
        Orchestrateur introuvable
      </div>
    );
  }

  const linked = linkedAgents(links, frames);
  const waiting = status.state === "running" && activity?.activity === "waiting";
  return (
    <div
      data-orchestrator={nodeId}
      className="relative flex h-full flex-col overflow-hidden rounded-xl bg-ov-surface-2"
      style={frameStyle("var(--ov-accent)", selected, waiting)}
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-ov-line px-3">
        <Network className="size-4 shrink-0 text-ov-accent" />
        <NameField nodeId={nodeId} value={record.payload.name} onCommit={(name) => renameOrchestrator(nodeId, name)} />
        <span className="ml-auto font-mono text-[11px] text-ov-text-2">{sessionLabel(status.state, activity?.activity)}</span>
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
      <div className="relative min-h-0 flex-1 bg-ov-terminal px-1 pt-1">
        <div ref={hostRef} className="relative h-full w-full overflow-hidden" />
        {session && <ResumeCard nodeId={nodeId} payload={session} status={status} />}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-ov-line px-3 py-2 text-xs text-ov-text-2">
        <span>
          {agentsText(linked.agentIds.length)} · {groupsText(linked.groups.length)}
        </span>
        <button
          type="button"
          onClick={() => uiStore.getState().setLinking(linking ? null : nodeId)}
          className="rounded-full bg-ov-accent px-2.5 py-0.5 text-[11px] font-semibold text-white hover:brightness-110"
        >
          {linking ? "Terminer" : "+ Relier"}
        </button>
      </div>
      {waiting && <div className="pointer-events-none absolute inset-0 z-20 rounded-xl" style={{ boxShadow: WAITING_GLOW }} />}
    </div>
  );
}

/** What its session does, in the header. */
function sessionLabel(state: TerminalStatus["state"], activity: Activity | undefined): string {
  if (state === "starting") return "démarrage";
  if (state !== "running") return "arrêté";
  return activity === "working" ? "au travail" : activity === "waiting" ? "attend une réponse" : "inactif";
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
