import { toast } from "sonner";
import type { Shortcut } from "./shortcuts";

/** What a command knows of the moment it runs in (spec fenêtre §7.3). */
export interface CommandContext {
  /** A project is open, its workspace on screen. */
  project: boolean;
  workspaceId: string | null;
  /** Terminals of the workspace on screen. */
  terminalCount: number;
  /** The terminal that has the keyboard, else the last of the workspace to have had it (spec fenêtre §6.3). */
  terminalId: string | null;
}

/**
 * One function of the application. Its shortcut, its palette line (J8) and
 * its radial menu entry run this same command: they never diverge (spec
 * fenêtre §3).
 */
export interface Command {
  id: string;
  label: string;
  section: string;
  keywords: readonly string[];
  shortcut?: Shortcut;
  available: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
}

/** The available command of a shortcut, if any. */
export function commandFor(commands: readonly Command[], shortcut: Shortcut, ctx: CommandContext): Command | null {
  return commands.find((command) => command.shortcut === shortcut && command.available(ctx)) ?? null;
}

/** Runs a command; a failure says so, like the menus (spec fenêtre §9). */
export function runCommand(command: Command, ctx: CommandContext) {
  const fail = (error: unknown) => toast.error(`${command.label} impossible : ${String(error)}`);
  try {
    void Promise.resolve(command.run(ctx)).catch(fail);
  } catch (error) {
    fail(error);
  }
}
