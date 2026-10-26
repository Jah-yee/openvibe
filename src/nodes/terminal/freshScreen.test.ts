// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { Terminal } from "@xterm/xterm";
import { freshScreen, textSince } from "./freshScreen";

const write = (term: Terminal, data: string) => new Promise<void>((resolve) => term.write(data, resolve));

it("keeps a relaunched Claude's banner, painted from the top of the screen, and drops the previous session's (final review H2)", async () => {
  const term = new Terminal({ rows: 6, cols: 60 });
  // The previous session: its banner on top, its prompt near the bottom.
  await write(term, " Claude Code v1.0.0\r\n> old work\r\n\r\n\r\n  ⏵⏵ auto mode on\x1b[1A");
  const marker = await freshScreen(term);
  await write(term, "── relance ──\r\nPS C:\\demo> claude\r\n");
  expect(textSince(term, marker, 50)).not.toContain("Claude Code v1");
  // ConPTY paints the new session from the top of the screen, line by line (seen in the app).
  await write(term, "\x1b[H Claude Code v2.1.304\x1b[K\r\n> \x1b[K");
  const fresh = textSince(term, marker, 50);
  expect(fresh).toContain("Claude Code v2.1.304");
  expect(fresh).not.toContain("old work");
  term.dispose();
});

it("reads a new session drawn on the alternate screen, though the previous one was killed there (final review H2)", async () => {
  const term = new Terminal({ rows: 6, cols: 60 });
  await write(term, "PS C:\\demo> claude\r\n\x1b[?1049h\x1b[H Claude Code v1.0.0\r\n> old work");
  const marker = await freshScreen(term);
  await write(term, "── relance ──\r\nPS C:\\demo> claude\r\n");
  expect(textSince(term, marker, 50)).not.toContain("Claude Code v1");
  // Claude draws on the alternate screen (seen in the app).
  await write(term, "\x1b[?1049h\x1b[H Claude Code v2.1.304\x1b[K\r\n> \x1b[K");
  const fresh = textSince(term, marker, 50);
  expect(fresh).toContain("Claude Code v2.1.304");
  expect(fresh).not.toContain("old work");
  term.dispose();
});

it("reads a new session that moves to the alternate screen after a previous one on the normal screen (final review H2)", async () => {
  const term = new Terminal({ rows: 6, cols: 60 });
  await write(term, "a\r\nb\r\nc\r\n Claude Code v1.0.0\r\n> old work\r\n");
  const marker = await freshScreen(term);
  await write(term, "── relance ──\r\nPS C:\\demo> claude\r\n");
  await write(term, "\x1b[?1049h\x1b[H Claude Code v2.1.304\x1b[K\r\n> \x1b[K");
  const fresh = textSince(term, marker, 50);
  expect(fresh).toContain("Claude Code v2.1.304");
  expect(fresh).not.toContain("old work");
  term.dispose();
});

it("reads the whole buffer without a marker", async () => {
  const term = new Terminal({ rows: 5, cols: 40 });
  await write(term, "un\r\ndeux");
  expect(textSince(term, undefined, 50)).toBe("un\ndeux");
  term.dispose();
});
