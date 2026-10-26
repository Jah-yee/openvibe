import type { ComponentType } from "react";
import {
  BringToFront,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Ellipsis,
  Focus,
  Layers,
  Link,
  Lock,
  LockOpen,
  MessageSquare,
  Network,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCw,
  Scan,
  SendToBack,
  Square,
  Terminal,
  Trash2,
  Type,
  Ungroup,
  UserPlus,
  X,
} from "lucide-react";
import { labelOf, type Command, type CommandContext } from "@/commands/command";
import { selectionLocked } from "@/commands/catalog/drawing";
import { COMMANDS } from "@/commands/registry";
import { agentsStore } from "@/fleet/agentsStore";
import { AGENTS, defaultAgent } from "@/fleet/catalog";

export type RingKind = "canvas" | "terminal" | "group" | "orchestrator" | "selection";
type Icon = ComponentType<{ className?: string }>;

export interface RingSlot {
  /** The registry's command, or the one of the moment (« Mettre en pause » / « Reprendre »). */
  command: string | ((ctx: CommandContext) => string);
  icon: Icon;
  /** The icon of the moment (the default agent's, the lock's). */
  iconOf?: (ctx: CommandContext) => Icon;
  /** Ends something: its icon in red. */
  danger?: boolean;
}

const defaultLaunch = () => `agent.launch.${defaultAgent(agentsStore.getState().agents)}`;
const resumes = (ctx: CommandContext) => COMMANDS.find((c) => c.id === "terminal.resume")?.available(ctx) ?? false;

/** The five rings, positions clockwise from the top (spec menu radial §4). */
export const RINGS: Record<RingKind, readonly (RingSlot | null)[]> = {
  canvas: [
    { command: defaultLaunch, icon: Play, iconOf: () => AGENTS[defaultAgent(agentsStore.getState().agents)].Icon },
    { command: "agent.launch.shell", icon: Terminal },
    { command: "agent.four", icon: Layers },
    { command: "agent.orchestrator", icon: Network },
    { command: "drawing.paste", icon: ClipboardPaste },
    { command: "tool.text", icon: Type },
    { command: "agent.other", icon: Plus },
    { command: "canvas.overview", icon: Scan },
  ],
  terminal: [
    { command: "terminal.copy", icon: Copy },
    { command: "terminal.paste", icon: ClipboardPaste },
    { command: "terminal.rename", icon: Pencil },
    { command: "terminal.relaunch", icon: RotateCw },
    { command: "terminal.close", icon: X, danger: true },
    { command: "terminal.duplicate", icon: CopyPlus },
    { command: (ctx) => (resumes(ctx) ? "terminal.resume" : "terminal.pause"), icon: Pause, iconOf: (ctx) => (resumes(ctx) ? Play : Pause) },
    { command: "terminal.stop", icon: Square },
  ],
  group: [
    { command: "group.addAgent", icon: UserPlus },
    { command: "group.rename", icon: Pencil },
    { command: "group.orchestrate", icon: Network },
    { command: "group.pause", icon: Pause },
    { command: "group.close", icon: X, danger: true },
    { command: "group.ungroup", icon: Ungroup },
    { command: "group.resume", icon: Play },
    { command: "group.frame", icon: Focus },
  ],
  orchestrator: [
    { command: "orchestrator.write", icon: MessageSquare },
    null,
    { command: "orchestrator.rename", icon: Pencil },
    null,
    { command: "orchestrator.remove", icon: Trash2, danger: true },
    null,
    { command: "orchestrator.link", icon: Link },
    { command: "orchestrator.paste", icon: ClipboardPaste },
  ],
  selection: [
    { command: "drawing.copy", icon: Copy },
    { command: "drawing.paste", icon: ClipboardPaste },
    { command: "drawing.duplicate", icon: CopyPlus },
    { command: "drawing.front", icon: BringToFront },
    { command: "drawing.delete", icon: Trash2, danger: true },
    { command: "drawing.back", icon: SendToBack },
    { command: "drawing.lock", icon: Lock, iconOf: () => (selectionLocked() ? LockOpen : Lock) },
    { command: "drawing.more", icon: Ellipsis },
  ],
};

export interface RingLine {
  command: Command;
  label: string;
  Icon: Icon;
  enabled: boolean;
  /** Why it is greyed, when the command says. */
  reason: string | null;
  danger: boolean;
}

/** A button as it shows now: its command, name, icon, and whether it can run (spec menu radial §5.1). */
export function lineOf(slot: RingSlot, ctx: CommandContext, commands: readonly Command[] = COMMANDS): RingLine | null {
  const id = typeof slot.command === "function" ? slot.command(ctx) : slot.command;
  const command = commands.find((c) => c.id === id);
  if (!command) return null;
  const available = command.available(ctx);
  const reason = available ? (command.disabled?.(ctx) ?? null) : null;
  return { command, label: labelOf(command, ctx), Icon: slot.iconOf?.(ctx) ?? slot.icon, enabled: available && reason === null, reason, danger: slot.danger ?? false };
}
