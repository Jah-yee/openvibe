import { useState, type ReactNode } from "react";
import { ChevronDown, RotateCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { AGENT_ORDER, AGENTS } from "@/fleet/catalog";
import type { AgentId } from "@/ipc/pty";
import type { TerminalPayload } from "@/nodes/types";
import { nodesStore } from "@/store/nodes";
import type { TerminalStatus } from "@/store/terminalStatus";
import type { LaunchMode } from "./launch";
import { relaunchTerminal, stopTerminal } from "./registry";
import { StatusPill } from "./StatusPill";
import { TerminalOptionsDialog } from "./TerminalOptionsDialog";

/** Agents that need no options can be switched to from the header. */
const SWITCHABLE = AGENT_ORDER.filter((id) => id !== "ollama" && id !== "custom");

export function HeaderButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      className="grid size-5 place-items-center rounded text-ov-text-2 hover:bg-ov-card hover:text-ov-text [&_svg]:size-3.5"
    >
      {props.children}
    </button>
  );
}

function switchAgent(nodeId: string, payload: TerminalPayload, agent: AgentId) {
  const needsSession = agent === "claude" && !payload.claudeSessionId;
  nodesStore.getState().update(nodeId, needsSession ? { agent, claudeSessionId: crypto.randomUUID() } : { agent });
}

function RelaunchMenu(props: { nodeId: string; payload: TerminalPayload; running: boolean }) {
  const { nodeId, payload, running } = props;
  const relaunch = (mode: LaunchMode) => relaunchTerminal(nodeId, payload, mode);
  const newSession = () => {
    const claudeSessionId = crypto.randomUUID();
    nodesStore.getState().update(nodeId, { claudeSessionId });
    relaunchTerminal(nodeId, { ...payload, claudeSessionId }, "new");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Relancer"
          aria-label="Relancer"
          className="grid size-5 place-items-center rounded text-ov-text-2 hover:bg-ov-card hover:text-ov-text [&_svg]:size-3.5"
        >
          <RotateCw />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {payload.agent === "claude" ? (
          <>
            <DropdownMenuItem onSelect={() => relaunch("resume")}>Reprendre la session</DropdownMenuItem>
            <DropdownMenuItem onSelect={newSession}>Nouvelle session</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => relaunch("continue")}>Plus récente du dossier</DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => relaunch("new")}>Relancer</DropdownMenuItem>
        )}
        {running && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => stopTerminal(nodeId)}>
              Arrêter le processus
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Header of a terminal node (spec habillage §7.1). */
export function TerminalHeader(props: {
  nodeId: string;
  payload: TerminalPayload;
  status: TerminalStatus;
  actions?: ReactNode;
}) {
  const { nodeId, payload, status, actions } = props;
  const [editing, setEditing] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const meta = AGENTS[payload.agent];

  return (
    <header
      title={payload.title}
      className="flex h-7 shrink-0 items-center gap-1.5 border-b border-ov-line bg-ov-terminal-head px-2 text-xs"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Agent" className="flex items-center gap-0.5 rounded px-0.5 hover:bg-ov-card">
            <meta.Icon className="size-3.5" style={{ color: meta.tint }} />
            <ChevronDown className="size-3 text-ov-text-2" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SWITCHABLE.map((id) => {
            const Icon = AGENTS[id].Icon;
            return (
              <DropdownMenuItem key={id} onSelect={() => switchAgent(nodeId, payload, id)}>
                <Icon style={{ color: AGENTS[id].tint }} /> {AGENTS[id].label}
                {id === payload.agent && <span className="ml-auto text-ov-text-2">actuel</span>}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setOptionsOpen(true)}>Options…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ov-idle" />
      {editing ? (
        <Input
          autoFocus
          defaultValue={payload.name}
          className="h-5 w-32 px-1 text-xs"
          onBlur={(e) => {
            const name = e.currentTarget.value.trim();
            if (name) nodesStore.getState().update(nodeId, { name });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <span
          className="truncate font-semibold text-ov-text"
          onDoubleClick={() => setEditing(true)}
          title="Double-clic pour renommer"
        >
          {payload.name || meta.label}
        </span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <StatusPill status={status} />
        <RelaunchMenu nodeId={nodeId} payload={payload} running={status.state === "running"} />
        {actions}
      </div>
      {optionsOpen && <TerminalOptionsDialog nodeId={nodeId} payload={payload} onClose={() => setOptionsOpen(false)} />}
    </header>
  );
}
