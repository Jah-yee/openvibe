import { commandFor, runCommand, type Command, type CommandContext } from "./command";
import { COMMANDS, commandContext } from "./registry";
import { isModalOpen, shortcutOf } from "./shortcuts";

/**
 * The application's single keydown listener (spec fenêtre §6.2): on the
 * window, in the capture phase, ahead of xterm, the fields, Excalidraw and
 * WebView2. A recognized shortcut whose command is available is consumed: it
 * reaches neither the terminal, nor its agent, nor Excalidraw.
 */
export function installShortcuts(
  target: Window,
  commands: readonly Command[] = COMMANDS,
  context: () => CommandContext = commandContext,
): () => void {
  const listener = (event: KeyboardEvent) => {
    const shortcut = shortcutOf(event);
    if (!shortcut || isModalOpen(target.document)) return;
    const ctx = context();
    const command = commandFor(commands, shortcut, ctx);
    if (!command) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runCommand(command, ctx);
  };
  target.addEventListener("keydown", listener, { capture: true });
  return () => target.removeEventListener("keydown", listener, { capture: true });
}
