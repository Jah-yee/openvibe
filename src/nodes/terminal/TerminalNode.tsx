import { useEffect, useRef } from "react";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import { canvasStore, useCanvas } from "@/canvas/canvasStore";
import { AGENTS } from "@/fleet/catalog";
import { duplicateTerminal, requestClose } from "@/fleet/terminals";
import { useActivity } from "@/store/agentActivity";
import { nodesStore, useNodes } from "@/store/nodes";
import { useTerminalStatus } from "@/store/terminalStatus";
import { createFitScheduler, ZOOM_SETTLE_MS } from "./fitScheduler";
import { frameStyle, WAITING_GLOW } from "./frame";
import { layoutTerminal, mountTerminal } from "./registry";
import { ResumeCard } from "./ResumeCard";
import { HeaderButton, TerminalHeader } from "./TerminalHeader";

export function TerminalNode({ nodeId }: { nodeId: string }) {
  const payload = useNodes((s) => s.nodes[nodeId]?.payload);
  const status = useTerminalStatus(nodeId);
  const activity = useActivity(nodeId);
  const workspaceId = useNodes((s) => s.nodes[nodeId]?.workspaceId);
  const selected = useCanvas((s) => s.view.selectedIds.includes(nodeId));
  const hostRef = useRef<HTMLDivElement>(null);
  const hasPayload = payload !== undefined;

  useEffect(() => {
    const host = hostRef.current;
    const current = nodesStore.getState().nodes[nodeId]?.payload;
    if (!host || !current) return;
    const zoom = () => canvasStore.getState().view.zoom;
    mountTerminal(nodeId, host, current, zoom());
    const layout = () => layoutTerminal(nodeId, host, zoom());
    const onResize = createFitScheduler(layout);
    const onZoom = createFitScheduler(layout, ZOOM_SETTLE_MS);
    const observer = new ResizeObserver(onResize.schedule);
    observer.observe(host);
    const unsubscribe = canvasStore.subscribe((state, previous) => {
      if (state.view.zoom !== previous.view.zoom) onZoom.schedule();
    });
    return () => {
      observer.disconnect();
      unsubscribe();
      onResize.cancel();
      onZoom.cancel();
    };
  }, [nodeId, hasPayload]);

  if (!payload) {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-ov-line bg-ov-surface text-sm text-ov-text-2">
        Terminal introuvable
      </div>
    );
  }

  const waiting = status.state === "running" && activity?.activity === "waiting";
  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-xl bg-ov-terminal"
      style={frameStyle(AGENTS[payload.agent].tint, selected, waiting)}
    >
      <TerminalHeader
        nodeId={nodeId}
        payload={payload}
        status={status}
        activity={activity}
        actions={
          <>
            <HeaderButton
              label="Dupliquer"
              onClick={() =>
                workspaceId &&
                void duplicateTerminal(workspaceId, nodeId).catch((error: unknown) =>
                  toast.error(`Duplication impossible : ${String(error)}`),
                )
              }
            >
              <Copy />
            </HeaderButton>
            <HeaderButton label="Fermer" onClick={() => requestClose(nodeId)}>
              <X />
            </HeaderButton>
          </>
        }
      />
      {/* The padding sits on a wrapper: the grid is sized from the host's
          client size, which would include padding set on the host itself. */}
      <div className="relative min-h-0 flex-1 px-1 pt-1">
        <div ref={hostRef} className="relative h-full w-full overflow-hidden" />
        <ResumeCard nodeId={nodeId} payload={payload} status={status} />
      </div>
      {waiting && <div className="pointer-events-none absolute inset-0 z-20 rounded-xl" style={{ boxShadow: WAITING_GLOW }} />}
    </div>
  );
}
