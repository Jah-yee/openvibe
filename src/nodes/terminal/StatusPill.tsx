import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import type { AgentActivity } from "@/store/agentActivity";
import type { TerminalStatus } from "@/store/terminalStatus";
import { pillOf, type PillTone } from "./pill";

const TONES: Record<PillTone, string> = {
  live: "bg-ov-card text-ov-text",
  ready: "bg-ov-card text-ov-text",
  working: "border border-ov-working/70 text-ov-working",
  workingIndigo: "border border-[#707de3]/70 text-[#707de3]",
  waiting: "border border-ov-waiting/70 text-ov-waiting",
  stopped: "bg-ov-card text-ov-text-2",
  done: "border border-ov-done/60 text-ov-done",
  failed: "border border-ov-danger/60 text-ov-danger",
};

const DOTS: Record<PillTone, string> = {
  live: "bg-ov-live",
  ready: "bg-ov-text-2",
  working: "bg-ov-working",
  workingIndigo: "bg-[#707de3]",
  waiting: "bg-ov-waiting animate-pulse",
  stopped: "bg-ov-text-2/60",
  done: "bg-ov-done",
  failed: "bg-ov-danger",
};

/** Spec habillage §7.2; the tooltip tells how long the agent has been in its state (§10.4). */
export function StatusPill(props: { status: TerminalStatus; activity?: AgentActivity; indigo?: boolean }) {
  const { status, activity, indigo } = props;
  const now = useNow(15_000);
  const running = status.state === "running";
  const pill = pillOf(status, running ? activity?.activity : undefined, indigo);
  const title =
    status.state === "error"
      ? status.message
      : running && activity
        ? `${pill.label} depuis ${formatDuration(now - activity.since)}`
        : undefined;
  return (
    <span
      title={title}
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
