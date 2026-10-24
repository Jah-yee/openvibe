import { useState } from "react";
import { PenLine } from "lucide-react";
import { canvasStore } from "@/canvas/canvasStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toDisplayColor, toSceneColor } from "@/theme/sceneColors";
import { PEN_COLORS, PEN_WIDTHS } from "./tools";
import { RoundButton } from "./ui";

/** Pen tool with its COLOR and WIDTH menu (spec habillage §5.3). */
export function PenMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(PEN_COLORS[0].display);
  const [width, setWidth] = useState(2);

  const choose = (next: { color?: string; width?: number }) => {
    const api = canvasStore.getState().api;
    if (!api) return;
    const nextColor = next.color ?? color;
    const nextWidth = next.width ?? width;
    setColor(nextColor);
    setWidth(nextWidth);
    api.updateScene({
      appState: { currentItemStrokeColor: toSceneColor(nextColor), currentItemStrokeWidth: nextWidth },
    });
    api.setActiveTool({ type: "freedraw" });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) choose({});
      }}
    >
      <PopoverTrigger asChild>
        <RoundButton label="Stylo (P)" active={active}>
          <PenLine />
        </RoundButton>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-60">
        <p className="ov-label mb-2">Couleur</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {PEN_COLORS.map(({ label, display }) => (
            <button
              key={display}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => choose({ color: display })}
              className={cn(
                "size-6 rounded-full ring-offset-2 ring-offset-ov-surface-2",
                display === color && "ring-2 ring-ov-accent",
              )}
              style={{ backgroundColor: toDisplayColor(toSceneColor(display)) }}
            />
          ))}
          <label
            title="Couleur personnalisée"
            className="relative size-6 cursor-pointer overflow-hidden rounded-full border border-ov-line bg-[conic-gradient(#ef4444,#d9b35a,#5e9a55,#5cc8f0,#a47cf0,#ef4444)]"
          >
            <input
              type="color"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => choose({ color: e.target.value })}
            />
          </label>
        </div>
        <p className="ov-label mb-2">Épaisseur</p>
        <div className="flex gap-1.5">
          {PEN_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              aria-label={`Épaisseur ${w}`}
              onClick={() => choose({ width: w })}
              className={cn(
                "grid size-8 place-items-center rounded-lg border border-transparent bg-ov-card",
                w === width && "border-ov-accent bg-ov-accent-soft",
              )}
            >
              <span className="rounded-full bg-ov-text" style={{ width: w + 2, height: w + 2 }} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
