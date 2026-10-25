import { Search } from "lucide-react";
import { openPalette } from "@/commands/paletteState";
import { commandContext } from "@/commands/registry";
import { useProjects } from "@/store/projects";

/** « ⌕ Rechercher dans <projet>   Ctrl+P » at the center of the title bar (spec identité §5.1): it opens « Aller à ». */
export function SearchField() {
  const name = useProjects((s) => s.projects.find((p) => p.id === s.activeId)?.name ?? "");
  return (
    <button
      type="button"
      // The keyboard stays where it is: it goes back there when the palette closes.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => openPalette("goTo", commandContext())}
      className="flex h-[26px] w-[440px] max-w-[34vw] items-center gap-2 rounded-[8px] border border-ov-glass-line bg-ov-field px-2.5 text-[12.5px] text-ov-text-3 transition-colors hover:text-ov-text-2"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="truncate">Rechercher dans {name}</span>
      <span className="ml-auto shrink-0 font-mono text-[11px]">Ctrl+P</span>
    </button>
  );
}
