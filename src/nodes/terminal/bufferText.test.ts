import { expect, it } from "vitest";
import { bufferText } from "./bufferText";

const buffer = (rows: string[]) => ({ length: rows.length, getLine: (y: number) => ({ translateToString: () => rows[y] }) });

it("reads the last lines of a terminal as plain text, without the empty rows under the output", () => {
  const screen = buffer(["$ claude", "> Bonjour", "  Fait.", "", ""]);
  expect(bufferText(screen, 2)).toBe("> Bonjour\n  Fait.");
  expect(bufferText(screen, 200)).toBe("$ claude\n> Bonjour\n  Fait.");
  expect(bufferText(screen, 0)).toBe("");
});

it("reads from a line on: the screen of a terminal since its relaunch (final review H2)", () => {
  const screen = buffer(["Claude Code v2.1.304", "> old work", "── relance ──", "$ claude", ""]);
  expect(bufferText(screen, 50, 2)).toBe("── relance ──\n$ claude");
  expect(bufferText(screen, 1, 2)).toBe("$ claude");
});
