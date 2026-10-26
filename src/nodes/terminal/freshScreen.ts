import type { IMarker, Terminal } from "@xterm/xterm";
import { bufferText } from "./bufferText";

/**
 * A clean screen for a new session (final review H2, checked in the app):
 * back on the normal screen (the previous session may have been killed on
 * the alternate one), its lines go up into the scrollback, the cursor to the
 * top, and the marker there. ConPTY paints a new session from the top of the
 * screen, so its banner lands at or below the marker.
 */
export function freshScreen(term: Pick<Terminal, "write" | "rows" | "registerMarker">): Promise<IMarker | undefined> {
  return new Promise((resolve) => {
    term.write(`\x1b[?1049l\x1b[${term.rows};1H${"\r\n".repeat(term.rows)}\x1b[H`, () => resolve(term.registerMarker(0)));
  });
}

/**
 * The last `lines` lines the session wrote since `marker`. The alternate
 * screen is only ever the current session's (Claude draws there): it is read
 * whole, like the buffer without a marker or once the marker is gone.
 */
export function textSince(term: Pick<Terminal, "buffer">, marker: IMarker | undefined, lines: number): string {
  const buffer = term.buffer.active;
  const from = buffer.type === "normal" && marker && !marker.isDisposed ? marker.line : 0;
  return bufferText(buffer, lines, from);
}
