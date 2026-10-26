import { screenRectOf } from "@/fleet/placement";
import type { Step } from "@/nodes/steps";
import { terminalOf, useNodes } from "@/store/nodes";
import { useSubagents } from "@/store/subagents";
import { useCanvas, type CanvasView } from "../canvasStore";
import type { Rect } from "../groups";
import { dotsOf, TIMELINE_GAP } from "./timeline";

/**
 * Each Claude terminal's steps, under it (spec orchestrateur §5): a calque
 * like the group labels, over the canvas, letting the pointer through except
 * on the titles (their full text on hover).
 */
export function StepTimelines() {
  const rects = useCanvas((s) => s.nodeRects);
  const view = useCanvas((s) => s.view);
  const nodes = useNodes((s) => s.nodes);
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {Object.entries(rects).map(([id, rect]) => {
        const steps = terminalOf(nodes[id])?.steps;
        return steps?.length ? <Timeline key={id} nodeId={id} steps={steps} rect={rect} view={view} /> : null;
      })}
    </div>
  );
}

function Timeline({ nodeId, steps, rect, view }: { nodeId: string; steps: Step[]; rect: Rect; view: CanvasView }) {
  const running = useSubagents(nodeId);
  const screen = screenRectOf(rect, view);
  const dots = dotsOf(steps, screen.width);
  return (
    <div data-steps={nodeId} className="absolute h-10" style={{ left: screen.x, top: screen.y + screen.height + TIMELINE_GAP, width: screen.width }}>
      <div className="absolute inset-x-0 top-[5px] h-px bg-ov-line" />
      {dots.map((dot) => (
        <div key={dot.title} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: dot.x, width: dot.slot }}>
          <span className={dot.state === "en_cours" ? "size-[11px] animate-pulse rounded-full" : "size-[11px] rounded-full"} style={{ backgroundColor: dot.color }} />
          <span title={dot.title} className="pointer-events-auto mt-1 max-w-full truncate px-1 text-[10px] text-ov-text-2">
            {dot.title}
            {dot.state === "en_cours" && running > 0 ? ` ×${running}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
