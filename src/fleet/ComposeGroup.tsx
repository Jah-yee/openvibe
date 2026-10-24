import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgentId } from "@/ipc/pty";
import { cn } from "@/lib/utils";
import { ChipButton } from "@/shell/ui";
import { agentsStore, useAgents } from "./agentsStore";
import { AGENTS, AGENTS_WITHOUT_OPTIONS, defaultAgent } from "./catalog";
import { agentsOf, DEFAULT_GROUP_SIZE, MAX_GROUP_SIZE, nameAfterRoleChange, resizeSlots, type Slot } from "./composer";
import { launchGroup } from "./groups";
import { ROLE_ORDER, ROLES, type RoleId } from "./roles";

function AgentLogo({ agent, className }: { agent: AgentId; className?: string }) {
  const meta = AGENTS[agent];
  return (
    <span
      className={cn("grid size-7 place-items-center rounded-md", className)}
      style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`, color: meta.tint }}
    >
      <meta.Icon className="size-4" />
    </span>
  );
}

/** A slot of the grid: the agent's logo and label; a click opens the agents (spec §11.2). */
function SlotButton(props: { agent: AgentId; choices: AgentId[]; onPick: (agent: AgentId) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[10px] border border-ov-line bg-ov-card hover:border-ov-text-2"
        >
          <AgentLogo agent={props.agent} />
          <span className="max-w-full truncate px-1 text-[11px] text-ov-text">{AGENTS[props.agent].label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {props.choices.map((id) => {
          const meta = AGENTS[id];
          return (
            <DropdownMenuItem key={id} onSelect={() => props.onPick(id)}>
              <meta.Icon style={{ color: meta.tint }} /> {meta.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Composer un groupe", anchored above the « Groupe » chip (spec habillage §11.2). */
export function ComposeGroup() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<RoleId>("general");
  const [name, setName] = useState(ROLES.general.label);
  const [slots, setSlots] = useState<Slot[]>(resizeSlots([], DEFAULT_GROUP_SIZE));
  const agents = useAgents((s) => s.agents);
  const fallback = defaultAgent(agents);
  const choices = AGENTS_WITHOUT_OPTIONS.filter((id) => agents.some((a) => a.id === id && a.available));
  const color = ROLES[role].color;

  useEffect(() => {
    if (!open) return;
    setRole("general");
    setName(ROLES.general.label);
    setSlots(resizeSlots([], DEFAULT_GROUP_SIZE));
    void agentsStore.getState().load();
  }, [open]);

  const pickRole = (next: RoleId) => {
    setName((current) => nameAfterRoleChange(current, role, next));
    setRole(next);
  };

  const launch = () => {
    setOpen(false);
    void launchGroup({ name, role, agents: agentsOf(slots, fallback) }).catch((error: unknown) =>
      toast.error(`Lancement impossible : ${String(error)}`),
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ChipButton>Groupe</ChipButton>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={10} className="flex w-[360px] flex-col gap-3 p-3">
        <p className="ov-label">Composer un groupe</p>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-ov-line bg-ov-card px-2.5">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Nom du groupe"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ov-text outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_ORDER.map((id) => {
            const active = id === role;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pickRole(id)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs",
                  active ? "font-semibold text-ov-canvas" : "border-ov-line text-ov-text-2 hover:text-ov-text",
                )}
                style={active ? { backgroundColor: ROLES[id].color, borderColor: ROLES[id].color } : undefined}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: active ? "var(--ov-canvas)" : ROLES[id].color }}
                />
                {ROLES[id].label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot, i) => (
            <SlotButton
              key={i}
              agent={slot ?? fallback}
              choices={choices}
              onPick={(agent) => setSlots((current) => current.map((s, j) => (j === i ? agent : s)))}
            />
          ))}
        </div>
        {choices.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-ov-text-2">
            <span className="mr-1">Tout remplir avec</span>
            {choices.map((id) => (
              <button
                key={id}
                type="button"
                title={AGENTS[id].label}
                aria-label={`Tout remplir avec ${AGENTS[id].label}`}
                onClick={() => setSlots((current) => current.map(() => id))}
                className="rounded-md hover:brightness-125"
              >
                <AgentLogo agent={id} className="size-6" />
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-ov-line pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Un agent de moins"
              disabled={slots.length <= 1}
              onClick={() => setSlots((current) => resizeSlots(current, current.length - 1))}
              className="grid size-7 place-items-center rounded-full text-ov-text-2 hover:bg-ov-card hover:text-ov-text disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-6 text-center font-mono text-[13px] text-ov-text">{slots.length}</span>
            <button
              type="button"
              aria-label="Un agent de plus"
              disabled={slots.length >= MAX_GROUP_SIZE}
              onClick={() => setSlots((current) => resizeSlots(current, current.length + 1))}
              className="grid size-7 place-items-center rounded-full text-ov-text-2 hover:bg-ov-card hover:text-ov-text disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={launch}
            className="h-8 rounded-full px-4 text-[13px] font-semibold text-ov-canvas hover:brightness-110"
            style={{ backgroundColor: color }}
          >
            Lancer {slots.length}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
