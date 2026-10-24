import type { AgentId } from "@/ipc/pty";
import type { TerminalStatus } from "@/store/terminalStatus";

export type PillTone = "live" | "stopped" | "done" | "failed";

/**
 * The status pill of a terminal header (spec habillage §7.2). Until agent
 * activity is detected (plan B), a running process reads ACTIF.
 */
export function pillOf(status: TerminalStatus): { label: string; tone: PillTone } {
  switch (status.state) {
    case "running":
      return { label: "ACTIF", tone: "live" };
    case "stopped":
      return { label: "ARRÊTÉ", tone: "stopped" };
    case "exited":
      return {
        label: status.code === null ? "TERMINÉ" : `TERMINÉ · ${status.code}`,
        tone: status.code === null || status.code === 0 ? "done" : "failed",
      };
    case "error":
      return { label: "ERREUR", tone: "failed" };
  }
}

/** What the card over a stopped terminal offers (spec habillage §7.3). */
export function resumeOfferOf(status: TerminalStatus, agent: AgentId, hasSession: boolean): "resume" | "relaunch" | null {
  if (status.state === "running") return null;
  return agent === "claude" && hasSession ? "resume" : "relaunch";
}

/**
 * Typing in a terminal where nothing runs starts it again. Only real keystrokes
 * count: a restored screen makes xterm answer old terminal queries by itself.
 */
export function startsOnKeystroke(status: TerminalStatus): boolean {
  return status.state !== "running";
}
