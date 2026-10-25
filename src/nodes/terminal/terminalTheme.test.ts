import { expect, it } from "vitest";
import { cssBlock, readSource } from "@/theme/cssBlocks";
import { TERMINAL_THEME } from "./terminalTheme";

const tokens = readSource("theme/tokens.css");

it("draws xterm on the node's body color, dark in both themes (spec identité §4.2)", () => {
  for (const theme of [':root, :root[data-theme="dark"]', ':root[data-theme="light"]']) {
    expect(cssBlock(tokens, theme)["--ov-terminal"]).toBe(TERMINAL_THEME.background);
  }
  expect(TERMINAL_THEME).toEqual({ background: "#1A1918", cursor: "#D97757", selectionBackground: "#D9775755" });
});
