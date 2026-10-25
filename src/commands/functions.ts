import type { Command, CommandContext } from "./command";
import { rank } from "./search";

/**
 * The functions mode (spec fenêtre §7.3): the commands available at that
 * moment, by section in the registry's order, each ranked by the search. The
 * palette's own command is not listed in it.
 */
export function functionSections(commands: readonly Command[], ctx: CommandContext, query: string): { label: string; items: Command[] }[] {
  const listed = commands.filter((c) => c.id !== "palette.functions" && c.available(ctx));
  const labels: string[] = [];
  for (const command of listed) if (!labels.includes(command.section)) labels.push(command.section);
  return labels
    .map((label) => ({
      label,
      items: rank(
        listed.filter((c) => c.section === label),
        query,
        (c) => ({ label: c.label, keywords: c.keywords }),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
