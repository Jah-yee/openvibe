import { useState } from "react";
import { Circle, Diamond, Frame, Minus, MoveUpRight, Shapes, Square, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ShapeTool } from "./tools";
import { ToolButton } from "./buttons";

const SHAPES: { tool: ShapeTool; label: string; Icon: LucideIcon }[] = [
  { tool: "rectangle", label: "Rectangle", Icon: Square },
  { tool: "ellipse", label: "Ellipse", Icon: Circle },
  { tool: "diamond", label: "Losange", Icon: Diamond },
  { tool: "line", label: "Ligne", Icon: Minus },
  { tool: "arrow", label: "Flèche", Icon: MoveUpRight },
  { tool: "frame", label: "Cadre", Icon: Frame },
];

/** The SHAPES menu of the rail; `current` is Excalidraw's active tool. */
export function ShapesMenu(props: { active: boolean; current: string; onPick: (tool: ShapeTool) => void }) {
  const { active, current, onPick } = props;
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolButton label="Formes" active={active}>
          <Shapes />
        </ToolButton>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-60">
        <p className="ov-label mb-2">Formes</p>
        <div className="grid grid-cols-3 gap-1.5">
          {SHAPES.map(({ tool, label, Icon }) => (
            <button
              key={tool}
              type="button"
              onClick={() => {
                onPick(tool);
                setOpen(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border border-transparent bg-ov-card py-2 text-[11px] text-ov-text-2 hover:text-ov-text",
                tool === current && "border-ov-accent bg-ov-accent-soft text-ov-text",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
