import { useEffect, useRef } from "react";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import { canvasStore, useCanvas } from "@/canvas/canvasStore";
import { AGENTS } from "@/fleet/catalog";
import { duplicateTerminal, requestClose } from "@/fleet/terminals";
import { nodesStore, useNodes } from "@/store/nodes";
import { useTerminalStatus } from "@/store/terminalStatus";
import { createFitScheduler, ZOOM_SETTLE_MS } from "./fitScheduler";
import { layoutTerminal, mountTerminal } from "./registry";
import { ResumeCard } from "./ResumeCard";
import { HeaderButton, TerminalHeader } from "./TerminalHeader";

export function TerminalNode({ nodeId }: { nodeId: string }) {
  const payload = useNodes((s) => s.nodes[nodeId]?.payload);
  const status = useTerminalStatus(nodeId);
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

  const tint = AGENTS[payload.agent].tint;
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl bg-ov-terminal"
      style={{
        border: selected ? "1.5px solid var(--ov-accent)" : `1px solid color-mix(in srgb, ${tint} 45%, transparent)`,
        boxShadow: selected ? "0 0 0 3px color-mix(in srgb, var(--ov-accent) 15%, transparent)" : undefined,
      }}
    >
      <TerminalHeader
        nodeId={nodeId}
        payload={payload}
        status={status}
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
    </div>
  );
}
