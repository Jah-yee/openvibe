import { useEffect, useState } from "react";
import { Asterisk, Check, Network } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgentId } from "@/ipc/pty";
import { RoundButton } from "@/shell/ui";
import { uiStore } from "@/store/ui";
import { agentsStore, useAgents } from "./agentsStore";
import { AGENT_ORDER, agentInk, AGENTS, defaultAgent } from "./catalog";
import { defaultLaunchOptions, type LaunchOptions } from "./launchAgent";
import { LaunchOptionsForm } from "./LaunchOptionsForm";
import { OllamaPicker } from "./OllamaPicker";

type View = "agents" | "options" | "ollama";

/** "Lancer un agent", opened from the rail (spec habillage §10.1). */
export function AgentMenu() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("agents");
  const [options, setOptions] = useState<LaunchOptions | null>(null);
  const agents = useAgents((s) => s.agents);
  const shells = useAgents((s) => s.shells);
  const current = options ?? defaultLaunchOptions();
  const fallback = defaultAgent(agents);
  const available = (id: AgentId) => agents.find((a) => a.id === id)?.available ?? false;

  useEffect(() => {
    if (!open) return;
    setView("agents");
    void agentsStore.getState().load();
  }, [open]);

  const place = (agent: AgentId, launch: LaunchOptions) => {
    setOpen(false);
    uiStore.getState().setPlacing({ agent, options: launch });
  };

  const pick = (agent: AgentId) => {
    if (agent === "ollama") setView("ollama");
    else if (agent === "custom" && !current.command.trim()) setView("options");
    else place(agent, current);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <RoundButton label="Lancer un agent" active={open}>
          <Asterisk className={open ? undefined : "text-ov-accent"} />
        </RoundButton>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 p-2">
        {view === "agents" && (
          <>
            <p className="ov-label px-2 pb-1 pt-1">Lancer un agent</p>
            <div className="flex flex-col">
              {AGENT_ORDER.map((id) => {
                const meta = AGENTS[id];
                const usable = available(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!usable}
                    title={usable ? undefined : `${meta.binary} introuvable dans le PATH`}
                    onClick={() => pick(id)}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-ov-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span
                      className="grid size-7 place-items-center rounded-md"
                      style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`, color: agentInk(meta.tint) }}
                    >
                      <meta.Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ov-text">{meta.label}</span>
                      <span className="block text-[11px] text-ov-text-2">{meta.vendor}</span>
                    </span>
                    {id === fallback && <Check className="size-3.5 text-ov-accent" />}
                  </button>
                );
              })}
              {/* Spec habillage §10.1: placed the same way as an agent. */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  uiStore.getState().setPlacing({ orchestrator: true });
                }}
                className="mt-1 flex items-center gap-2.5 rounded-lg border-t border-ov-line px-2 py-1.5 text-left hover:bg-ov-hover"
              >
                <span className="grid size-7 place-items-center rounded-md bg-ov-accent-soft text-ov-accent">
                  <Network className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ov-text">Orchestrateur</span>
                  <span className="block text-[11px] text-ov-text-2">commande des groupes et des agents</span>
                </span>
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-ov-line px-2 pt-2 text-[11px] text-ov-text-2">
              <span>puis clique sur le canvas pour le poser</span>
              <button type="button" className="text-ov-accent hover:underline" onClick={() => setView("options")}>
                Options
              </button>
            </div>
          </>
        )}
        {view === "options" && (
          <LaunchOptionsForm
            value={current}
            shells={shells}
            onChange={setOptions}
            onBack={() => setView("agents")}
            footer={
              <button
                type="button"
                disabled={!current.command.trim()}
                onClick={() => place("custom", current)}
                className="h-8 rounded-full bg-ov-accent text-xs font-semibold text-white disabled:opacity-40"
              >
                Lancer la commande personnalisée
              </button>
            }
          />
        )}
        {view === "ollama" && (
          <OllamaPicker
            aiderAvailable={available("aider")}
            onBack={() => setView("agents")}
            onPick={(ollama) => place("ollama", { ...current, ollama })}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
