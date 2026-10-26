import { arrive, showNode } from "@/canvas/arrive";
import { removeOrchestrator } from "@/fleet/orchestrators";
import { pasteIntoTerminal } from "@/nodes/terminal/registry";
import { readClipboardText } from "@/radial/bridges";
import { nodesStore } from "@/store/nodes";
import { uiStore } from "@/store/ui";
import type { Command, CommandContext } from "../command";
import { requestUi } from "../uiRequests";

/** The orchestrator the radial menu points at; the palette never sets one (spec menu radial §6.2). */
function orchestratorOf(ctx: CommandContext): string | null {
  const id = ctx.project ? ctx.orchestratorId : null;
  return id && nodesStore.getState().nodes[id]?.kind === "orchestrator" ? id : null;
}

const hasOrchestrator = (ctx: CommandContext) => orchestratorOf(ctx) !== null;
// `available` guarantees it before `run`.
const id = (ctx: CommandContext) => ctx.orchestratorId as string;

function section(ctx: CommandContext): string {
  const record = nodesStore.getState().nodes[ctx.orchestratorId ?? ""];
  const name = record?.kind === "orchestrator" ? (record.payload as { name?: string }).name : undefined;
  return `Orchestrateur · ${name ?? ""}`;
}

export const ORCHESTRATOR: readonly Command[] = [
  { id: "orchestrator.write", label: "Écrire une consigne", section, keywords: ["consigne", "orchestrateur"], available: hasOrchestrator, run: (ctx) => void arrive(id(ctx)) },
  {
    id: "orchestrator.rename",
    label: "Renommer",
    section,
    keywords: ["nom", "orchestrateur"],
    available: hasOrchestrator,
    run: (ctx) => {
      showNode(id(ctx));
      requestUi({ kind: "renameOrchestrator", id: id(ctx) });
    },
  },
  { id: "orchestrator.link", label: "Relier", section, keywords: ["relier", "orchestrateur"], available: hasOrchestrator, run: (ctx) => uiStore.getState().setLinking(id(ctx)) },
  {
    id: "orchestrator.paste",
    label: "Coller",
    section,
    keywords: ["coller", "presse-papiers"],
    available: hasOrchestrator,
    run: async (ctx) => {
      const text = await readClipboardText();
      if (text === null) return;
      // Like a terminal's « Coller »: its session's terminal takes the keyboard, then the text.
      arrive(id(ctx));
      pasteIntoTerminal(id(ctx), text);
    },
  },
  { id: "orchestrator.remove", label: "Supprimer", section, keywords: ["supprimer", "orchestrateur"], available: hasOrchestrator, run: (ctx) => removeOrchestrator(id(ctx)) },
];
