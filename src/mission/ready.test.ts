import { describe, expect, it } from "vitest";
import { trustKeys, whenReady, type ReadyProbe } from "./ready";

const TRUST = "Accessing workspace:\n\nQuick safety check: Is this a project you created or one you trust?\n\n❯ No, exit\n  Yes, I trust this folder\n\nEnter to confirm · Esc to cancel";
const CLAUDE = " ✻  Claude Code v2.1.304\n    Opus 5.5\n\n> ";

/** An agent's terminal on a simulated clock: what it shows, when it last wrote, what was pressed. */
function agent(first: string, onPress: (keys: string, show: (screen: string) => void) => void = () => undefined) {
  let clock = 0;
  let wrote = 0;
  let screen = first;
  const pressed: string[] = [];
  const show = (next: string) => {
    screen = next;
    wrote = clock;
  };
  const probe: ReadyProbe = {
    running: () => true,
    quietMs: () => clock - wrote,
    screen: () => screen,
    press: async (keys) => {
      pressed.push(keys);
      onPress(keys, show);
    },
  };
  const wait = async (ms: number) => {
    clock += ms;
  };
  return { probe, wait, pressed, now: () => clock, wroteAt: () => wrote };
}

describe("trustKeys (spec orchestrateur §7.3)", () => {
  it("moves to « Yes » when « No » is selected, presses Enter when « Yes » already is", () => {
    expect(trustKeys(TRUST)).toEqual(["\x1b[B", "\r"]);
    expect(trustKeys(TRUST.replace("❯ No, exit\n  Yes", "  No, exit\n❯ Yes"))).toEqual(["\r"]);
    expect(trustKeys(CLAUDE)).toBeNull();
  });
});

describe("whenReady (spec orchestrateur §7.3)", () => {
  it("accepts the trust prompt once, then waits for Claude's prompt to stay quiet 2 s", async () => {
    const a = agent(TRUST, (keys, show) => {
      if (keys === "\r") show(CLAUDE);
    });
    expect(await whenReady(a.probe, a.wait)).toBe(true);
    expect(a.pressed).toEqual(["\x1b[B", "\r"]);
    expect(a.now() - a.wroteAt()).toBeGreaterThanOrEqual(2000);
    expect(a.now() - a.wroteAt()).toBeLessThan(2500);
  });

  it("is ready at once when Claude is already quiet", async () => {
    const a = agent(CLAUDE);
    await a.wait(5000);
    expect(await whenReady(a.probe, a.wait)).toBe(true);
    expect(a.pressed).toEqual([]);
  });

  it("gives up after 60 s, and never answers the prompt twice", async () => {
    const a = agent(TRUST);
    expect(await whenReady(a.probe, a.wait)).toBe(false);
    expect(a.now()).toBeGreaterThanOrEqual(60_000);
    expect(a.pressed).toEqual(["\x1b[B", "\r"]);
  });
});
