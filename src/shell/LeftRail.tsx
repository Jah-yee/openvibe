import type { ReactNode } from "react";
import { Asterisk, Eraser, Image as ImageIcon, Maximize, MousePointer2, Type } from "lucide-react";
import { canvasStore, useCanvas } from "@/canvas/canvasStore";
import { uiStore } from "@/store/ui";
import { PenMenu } from "./PenMenu";
import { ShapesMenu } from "./ShapesMenu";
import { railToolOf, type ShapeTool } from "./tools";
import { RoundButton } from "./ui";

type Tool = "selection" | "text" | "eraser" | "image" | ShapeTool;

const setTool = (type: Tool) => canvasStore.getState().api?.setActiveTool({ type });

function fitAll() {
  const api = canvasStore.getState().api;
  const elements = api?.getSceneElements() ?? [];
  if (api && elements.length > 0) {
    api.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.9, animate: true });
  }
}

const Separator = () => <span aria-hidden className="my-1 h-px w-5 bg-ov-line" />;

/**
 * The vertical tool pill on the left (spec habillage §5.3). It replaces
 * Excalidraw's toolbar and follows its active tool, keyboard shortcuts included.
 */
export function LeftRail({ agentButton }: { agentButton?: ReactNode }) {
  const tool = useCanvas((s) => s.view.tool);
  const active = railToolOf(tool);

  return (
    <nav className="pointer-events-auto absolute left-4 top-1/2 z-30 flex w-11 -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-ov-line bg-ov-surface py-2 shadow-ov">
      <RoundButton label="Sélection (V)" active={active === "selection"} onClick={() => setTool("selection")}>
        <MousePointer2 />
      </RoundButton>
      {agentButton ?? (
        <RoundButton label="Lancer un agent" onClick={() => uiStore.getState().setLaunchOpen(true)}>
          <Asterisk className="text-ov-accent" />
        </RoundButton>
      )}
      <ShapesMenu active={active === "shapes"} current={tool} onPick={setTool} />
      <RoundButton label="Texte (T)" active={active === "text"} onClick={() => setTool("text")}>
        <Type />
      </RoundButton>
      <PenMenu active={active === "pen"} />
      <RoundButton label="Gomme (E)" active={active === "eraser"} onClick={() => setTool("eraser")}>
        <Eraser />
      </RoundButton>
      <Separator />
      <RoundButton label="Image" active={active === "image"} onClick={() => setTool("image")}>
        <ImageIcon />
      </RoundButton>
      <Separator />
      <RoundButton label="Ajuster la vue" onClick={fitAll}>
        <Maximize />
      </RoundButton>
    </nav>
  );
}
