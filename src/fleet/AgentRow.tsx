import type { ReactNode } from "react";
import { Crosshair, Pause, Play, X } from "lucide-react";
import { focusNode } from "@/canvas/focusNode";
import { HeaderButton } from "@/nodes/terminal/TerminalHeader";
import { StatusPill } from "@/nodes/terminal/StatusPill";
import { useActivity } from "@/store/agentActivity";
import { terminalOf, useNodes } from "@/store/nodes";
import { useTerminalStatus } from "@/store/terminalStatus";
import { canPause, canResume, pauseAgents, resumeAgent } from "./broadcast";
import { AGENTS, INDIGO } from "./catalog";
import { requestClose } from "./terminals";

/**
 * One agent of the fleet panel or of an orchestrator: logo, name, agent, pill;
 * on hover, Centrer (orchestrator), Pause, Reprendre and Fermer (spec habillage §5.5, §13).
 */
export function AgentRow(props: { id: string; onOpen?: () => void; trailing?: ReactNode; showCenter?: boolean }) {
  const { id, onOpen, trailing, showCenter = false } = props;
  const payload = useNodes((s) => terminalOf(s.nodes[id]));
  const status = useTerminalStatus(id);
  const activity = useActivity(id);
  if (!payload) return null;
  const meta = AGENTS[payload.agent];
  const name = payload.name || meta.label;
  const facts = { agent: payload.agent, running: status.state === "running", activity: activity?.activity };
  return (
    <div className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-ov-hover">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`, color: meta.tint }}
        >
          <meta.Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ov-text">
          {name} <span className="text-ov-text-2">{meta.label}</span>
        </span>
      </button>
      <StatusPill status={status} activity={activity} indigo={meta.tint === INDIGO} />
      {trailing}
      <span className="hidden items-center gap-0.5 group-hover:flex">
        {showCenter && (
          <HeaderButton label={`Centrer ${name}`} onClick={() => focusNode(id)}>
            <Crosshair />
          </HeaderButton>
        )}
        {canPause(facts) && (
          <HeaderButton label={`Mettre ${name} en pause`} onClick={() => void pauseAgents([id])}>
            <Pause />
          </HeaderButton>
        )}
        {canResume(facts) && (
          <HeaderButton label={`Reprendre ${name}`} onClick={() => void resumeAgent(id)}>
            <Play />
          </HeaderButton>
        )}
        <HeaderButton label={`Fermer ${name}`} onClick={() => requestClose(id)}>
          <X />
        </HeaderButton>
      </span>
    </div>
  );
}
