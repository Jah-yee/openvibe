import { expect, it } from "vitest";
import { TABS_HEIGHT, TITLE_BAR_HEIGHT, TOP_ROW_HEIGHT } from "@/shell/layout";
import { readSource } from "./cssBlocks";

const index = readSource("index.css");

it("binds Tailwind's dark variant to the dark theme, not to a fixed class (spec identité §4.5)", () => {
  expect(readSource("../index.html")).not.toMatch(/class="dark"/);
  expect(index).toContain('@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));');
});

it("puts menus, popovers, lists, dialogs and toasts in dense glass (spec identité §5.10)", () => {
  for (const slot of ["dropdown-menu-content", "dropdown-menu-sub-content", "popover-content", "select-content", "dialog-content"]) {
    expect(index).toContain(`[data-slot="${slot}"]`);
  }
  expect(index).toMatch(/\[data-slot="select-content"\] \{[^}]*var\(--ov-glass-strong\)[^}]*var\(--ov-blur\)[^}]*border-radius: 12px/);
  expect(index).toMatch(/\[data-slot="dialog-content"\] \{[^}]*var\(--ov-glass-strong\)[^}]*border-radius: 16px/);
  expect(index).toMatch(/\[data-slot="dialog-overlay"\] \{[^}]*rgb\(0 0 0 \/ 0\.25\)[^}]*blur\(3px\)/);
  expect(index).toMatch(/:root\[data-transparency="off"\] \[data-slot="dialog-overlay"\] \{[^}]*backdrop-filter: none/);
  expect(index).toMatch(/\[data-sonner-toast\]\[data-styled="true"\] \{[^}]*var\(--ov-glass-strong\)[^}]*border-radius: 14px/);
});

it("docks Excalidraw's properties panel in glass, right of the tool rail (spec identité §5.7)", () => {
  const excalidraw = readSource("theme/excalidraw.css");
  expect(excalidraw).toMatch(/\.excalidraw \.App-menu__left \{[^}]*left: 70px;[^}]*var\(--ov-glass-strong\)[^}]*var\(--ov-blur\)[^}]*border-radius: 14px/);
});

it("stacks the title bar and the tabs: 72 px of canvas under them (spec identité §7)", () => {
  expect([TITLE_BAR_HEIGHT, TABS_HEIGHT, TOP_ROW_HEIGHT]).toEqual([38, 34, 72]);
});
