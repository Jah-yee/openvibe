import type { Command } from "../command";
import { catalog, type CommandKey } from "./messages";

type Rest = Omit<Command, "id" | "label" | "keywords" | "section"> & { label?: Command["label"]; keywords?: readonly string[]; section: Command["section"] };

/**
 * A command whose label and keywords are the catalog's, read when the palette
 * lists or searches it, so they follow the interface's language.
 */
export function command(key: CommandKey, rest: Rest): Command {
  return Object.defineProperties({ id: key, ...rest } as Command, {
    label: rest.label ? { value: rest.label, enumerable: true } : { get: () => catalog().commands[key].label, enumerable: true },
    keywords: { get: () => rest.keywords ?? catalog().commands[key].keywords, enumerable: true },
  });
}

type Sections = ReturnType<typeof catalog>["sections"];

/** A fixed section's name, read when the palette lists it. */
export const sectionNamed =
  (pick: (sections: Sections) => string) =>
  (): string =>
    pick(catalog().sections);

/** A command made in a loop, with label and keywords read when needed. */
export function derived(base: Omit<Command, "label" | "keywords">, label: () => string, keywords: () => readonly string[]): Command {
  return Object.defineProperties({ ...base } as Command, {
    label: { get: label, enumerable: true },
    keywords: { get: keywords, enumerable: true },
  });
}
