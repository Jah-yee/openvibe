import { labelOf, sectionOf, type Command, type CommandContext } from "./command";
import { rank, rankSections } from "./search";

/** A line of the functions mode, as listed at this moment. */
export interface FunctionLine {
  command: Command;
  label: string;
  section: string;
  /** Its shortcut, or the key Excalidraw gives it. */
  hint: string | null;
  /** Why it cannot run, when it is listed greyed. */
  disabled: string | null;
}

/**
 * The functions mode (spec fenêtre §7.3): the commands available at that
 * moment, by section in the registry's order, each ranked by the search, the
 * section of the best match first while searching. The palette's own command
 * is not listed in it.
 */
export function functionSections(commands: readonly Command[], ctx: CommandContext, query: string): { label: string; items: FunctionLine[] }[] {
  const lines = commands
    .filter((c) => c.id !== "palette.functions" && c.available(ctx))
    .map(
      (command): FunctionLine => ({
        command,
        label: labelOf(command, ctx),
        section: sectionOf(command, ctx),
        hint: command.shortcut ?? command.keys ?? null,
        disabled: command.disabled?.(ctx) ?? null,
      }),
    );
  const textOf = (l: FunctionLine) => ({ label: l.label, keywords: l.command.keywords });
  const labels: string[] = [];
  for (const line of lines) if (!labels.includes(line.section)) labels.push(line.section);
  const sections = labels
    .map((label) => ({ label, items: rank(lines.filter((l) => l.section === label), query, textOf) }))
    .filter((section) => section.items.length > 0);
  return rankSections(sections, query, textOf);
}
