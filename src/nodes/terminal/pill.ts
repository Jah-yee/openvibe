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

/**
 * "Taper" in "taper démarre à neuf": a character or Enter. Escape, arrows,
 * function keys and shortcuts (Ctrl+C, Ctrl+Z…) are reflexes, not typing, and
 * must not throw away the conversation the card offers to resume. AltGr
 * characters (Ctrl+Alt on Windows) count as typing.
 */
export function isTypingKey(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey">): boolean {
  const altGr = e.ctrlKey && e.altKey;
  const shortcut = e.metaKey || (!altGr && (e.ctrlKey || e.altKey));
  return !shortcut && ([...e.key].length === 1 || e.key === "Enter");
}

/** A failed launch created no conversation: retrying keeps the same Claude session id. */
export function startsNewConversation(status: TerminalStatus): boolean {
  return status.state !== "error";
}
