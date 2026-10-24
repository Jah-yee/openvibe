import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgents } from "./agentsStore";
import { AGENTS, AGENTS_WITHOUT_OPTIONS } from "./catalog";
import { addAgentToGroup, renameGroup, requestCloseGroup, ungroup } from "./groups";

/** The `⌄` of a group label (spec habillage §11.4); J5 adds the orchestrator, pause and resume. */
export function GroupMenu({ groupId }: { groupId: string }) {
  const agents = useAgents((s) => s.agents);
  const available = (id: string) => agents.some((agent) => agent.id === id && agent.available);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu du groupe"
          className="pointer-events-auto ml-1 grid size-5 place-items-center rounded text-ov-text-2 hover:bg-ov-card hover:text-ov-text"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      {/* Focus must not come back to the trigger: it would close Excalidraw's name editor. */}
      <DropdownMenuContent align="start" className="w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem onSelect={() => requestAnimationFrame(() => renameGroup(groupId))}>Renommer</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Ajouter un agent</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {AGENTS_WITHOUT_OPTIONS.map((id) => {
              const meta = AGENTS[id];
              return (
                <DropdownMenuItem
                  key={id}
                  disabled={!available(id)}
                  onSelect={() =>
                    void addAgentToGroup(groupId, id).catch((error: unknown) =>
                      toast.error(`Lancement impossible : ${String(error)}`),
                    )
                  }
                >
                  <meta.Icon style={{ color: meta.tint }} /> {meta.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => ungroup(groupId)}>Dégrouper</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => requestCloseGroup(groupId)}>
          Fermer le groupe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
