/** What readiness reads of an agent's terminal, and how it answers it (spec orchestrateur §7.3). */
export interface ReadyProbe {
  running(): boolean;
  quietMs(): number;
  screen(): string;
  press(keys: string): Promise<void>;
}

export const READY_QUIET_MS = 2000;
export const READY_TIMEOUT_MS = 60_000;
const TICK_MS = 250;
const BETWEEN_KEYS_MS = 300;
/** Claude's welcome banner: its prompt is up. */
const CLAUDE_UP = /Claude Code v\d/;

/** The keys that accept Claude's « trust this folder » prompt, or null when it does not show. */
export function trustKeys(screen: string): string[] | null {
  if (!/trust/i.test(screen) || !/folder/i.test(screen)) return null;
  const selected = screen.split("\n").find((line) => line.trimStart().startsWith("❯"));
  return selected && /yes/i.test(selected) ? ["\r"] : ["\x1b[B", "\r"];
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * True once the agent can take its sub-task: it runs, its trust prompt was
 * accepted (once — only OpenVibe's fresh worktrees ask), Claude's prompt is up
 * and quiet for 2 s. False after 60 s.
 */
export async function whenReady(probe: ReadyProbe, wait: (ms: number) => Promise<void> = sleep): Promise<boolean> {
  let trusted = false;
  for (let waited = 0; waited < READY_TIMEOUT_MS; waited += TICK_MS) {
    if (probe.running()) {
      const screen = probe.screen();
      const keys = trusted ? null : trustKeys(screen);
      if (keys) {
        trusted = true;
        for (const [i, key] of keys.entries()) {
          if (i > 0) await wait(BETWEEN_KEYS_MS);
          await probe.press(key);
        }
      } else if (CLAUDE_UP.test(screen) && probe.quietMs() >= READY_QUIET_MS) {
        return true;
      }
    }
    await wait(TICK_MS);
  }
  return false;
}
