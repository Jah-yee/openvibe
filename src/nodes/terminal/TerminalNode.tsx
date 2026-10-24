import { useEffect, useRef, useState } from "react";
import { ChevronDown, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TerminalPayload } from "@/nodes/types";
import { nodesStore, useNodes } from "@/store/nodes";
import { useTerminalStatus, type TerminalStatus } from "@/store/terminalStatus";
import { createFitScheduler } from "./fitScheduler";
import { PRESET_LABELS, type LaunchMode } from "./launch";
import { fitTerminal, mountTerminal, relaunchTerminal, stopTerminal } from "./registry";

export function TerminalNode({ nodeId }: { nodeId: string }) {
  const payload = useNodes((s) => s.nodes[nodeId]?.payload);
  const status = useTerminalStatus(nodeId);
  const hostRef = useRef<HTMLDivElement>(null);
  const hasPayload = payload !== undefined;

  useEffect(() => {
    const host = hostRef.current;
    const current = nodesStore.getState().nodes[nodeId]?.payload;
    if (!host || !current) return;
    mountTerminal(nodeId, host, current);
    const fit = createFitScheduler(() => fitTerminal(nodeId, host));
    const observer = new ResizeObserver(fit.schedule);
    observer.observe(host);
    return () => {
      observer.disconnect();
      fit.cancel();
    };
  }, [nodeId, hasPayload]);

  if (!payload) {
    return <div className="grid h-full place-items-center rounded-md border bg-card text-sm">Terminal introuvable</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-[#1e1e1e]">
      <TerminalHeader nodeId={nodeId} payload={payload} status={status} />
      {status.state !== "running" && <StoppedBanner nodeId={nodeId} payload={payload} status={status} />}
      {/* The padding sits on a wrapper: FitAddon measures the host's border-box
          height, so padding on the host itself would clip the last row. */}
      <div className="min-h-0 flex-1 px-1 pt-1">
        <div ref={hostRef} className="h-full w-full" />
      </div>
    </div>
  );
}

function TerminalHeader(props: { nodeId: string; payload: TerminalPayload; status: TerminalStatus }) {
  const { nodeId, payload, status } = props;
  const [editing, setEditing] = useState(false);
  const running = status.state === "running";

  return (
    <header className="flex h-8 shrink-0 items-center gap-2 border-b bg-card px-2 text-xs">
      <span
        className={cn("size-2 shrink-0 rounded-full", running ? "bg-green-500" : status.state === "error" ? "bg-destructive" : "bg-muted-foreground")}
        aria-label={running ? "actif" : "arrêté"}
      />
      {editing ? (
        <Input
          autoFocus
          defaultValue={payload.title}
          className="h-6 text-xs"
          onBlur={(e) => {
            const title = e.currentTarget.value.trim();
            if (title) nodesStore.getState().update(nodeId, { title });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <span className="truncate font-medium" onDoubleClick={() => setEditing(true)} title="Double-clic pour renommer">
          {payload.title}
        </span>
      )}
      <span className="shrink-0 text-muted-foreground">{PRESET_LABELS[payload.preset]}</span>
      <div className="ml-auto flex shrink-0">
        {running && (
          <Button size="icon" variant="ghost" className="size-6" aria-label="Arrêter" onClick={() => stopTerminal(nodeId)}>
            <Square />
          </Button>
        )}
      </div>
    </header>
  );
}

function StoppedBanner(props: { nodeId: string; payload: TerminalPayload; status: TerminalStatus }) {
  const { nodeId, payload, status } = props;
  const relaunch = (mode: LaunchMode) => relaunchTerminal(nodeId, payload, mode);
  const newSession = () => {
    const claudeSessionId = crypto.randomUUID();
    nodesStore.getState().update(nodeId, { claudeSessionId });
    relaunchTerminal(nodeId, { ...payload, claudeSessionId }, "new");
  };
  const label =
    status.state === "exited"
      ? `Terminé (code ${status.code ?? "?"})`
      : status.state === "error"
        ? `Erreur : ${status.message}`
        : "Arrêté";

  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-muted px-2 py-1 text-xs">
      <span className="truncate">{label}</span>
      <div className="ml-auto flex shrink-0">
        {payload.preset === "claude" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="h-6">
                <RotateCcw /> Relancer <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => relaunch("resume")}>Reprendre la session</DropdownMenuItem>
              <DropdownMenuItem onSelect={newSession}>Nouvelle session</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => relaunch("continue")}>Plus récente du dossier</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" variant="secondary" className="h-6" onClick={() => relaunch("new")}>
            <RotateCcw /> Relancer
          </Button>
        )}
      </div>
    </div>
  );
}
