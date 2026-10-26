import { screenRectOf } from "@/fleet/placement";
import type { Step } from "@/nodes/steps";
import { terminalOf, useNodes } from "@/store/nodes";
import { useSubagents } from "@/store/subagents";
import { useCanvas, type CanvasView } from "../canvasStore";
import type { Rect } from "../groups";
import { dotsOf, TIMELINE_GAP } from "./timeline";

/**
 * Each Claude terminal's steps, under it (spec orchestrateur §5). Like the
 * group backdrops, the layer sits under the nodes and takes no pointer: a
 * frieze never covers nor blocks the header of the row below it. It is drawn
 * at the scene's size and scaled like the nodes.
 */
export function StepTimelines() {
  const rects = useCanvas((s) => s.nodeRects);
  const view = useCanvas((s) => s.view);
  const nodes = useNodes((s) => s.nodes);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
  const dots = dotsOf(steps, rect.width);
  return (
    <div
      data-steps={nodeId}
      className="absolute h-[21px]"
      style={{
        left: screen.x,
        top: screen.y + screen.height + TIMELINE_GAP * view.zoom,
        width: rect.width,
        transform: `scale(${view.zoom})`,
        transformOrigin: "0 0",
      }}
    >
      <div className="absolute inset-x-0 top-[3px] h-px bg-ov-line" />
      {dots.map((dot) => (
        <div key={dot.title} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: dot.x, width: dot.slot }}>
          <span className={dot.state === "en_cours" ? "size-[7px] animate-pulse rounded-full" : "size-[7px] rounded-full"} style={{ backgroundColor: dot.color }} />
          <span className="mt-px max-w-full truncate px-1 text-[9px] leading-[11px] text-ov-text-2">
            {dot.title}
            {dot.state === "en_cours" && running > 0 ? ` ×${running}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
