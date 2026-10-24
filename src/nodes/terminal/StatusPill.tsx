import { cn } from "@/lib/utils";
import type { TerminalStatus } from "@/store/terminalStatus";
import { pillOf, type PillTone } from "./pill";

const TONES: Record<PillTone, string> = {
  live: "bg-[#322f28] text-ov-text",
  stopped: "bg-ov-card text-ov-text-2",
  done: "border border-ov-done/60 text-ov-done",
  failed: "border border-ov-danger/60 text-ov-danger",
};

const DOTS: Record<PillTone, string> = {
  live: "bg-ov-live",
  stopped: "bg-ov-text-2/60",
  done: "bg-ov-done",
  failed: "bg-ov-danger",
};

export function StatusPill({ status }: { status: TerminalStatus }) {
  const pill = pillOf(status);
  return (
    <span
      title={status.state === "error" ? status.message : undefined}
      className={cn(
        "flex h-4 items-center gap-1 rounded-full px-1.5 font-mono text-[9px] font-medium tracking-wide",
        TONES[pill.tone],
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[pill.tone])} />
      {pill.label}
    </span>
  );
}
