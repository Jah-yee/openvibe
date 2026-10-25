import type { ReactNode } from "react";
import { TITLE_BAR_HEIGHT } from "./layout";
import { Logo } from "./Logo";
import { WindowControls } from "./WindowControls";

/**
 * The title bar (spec identité §5.1): the logo, `leading` (the project picker,
 * or the app's name), a spacer, `trailing` (the agent counts), the window
 * buttons in the corner. The bar and its spacer carry Tauri's bare drag
 * attribute: a click aimed at them moves the window, a double-click maximizes
 * it; a click on any button inside does not.
 */
export function TitleBar({ leading, trailing }: { leading: ReactNode; trailing?: ReactNode }) {
  return (
    <div
      data-tauri-drag-region=""
      className="ov-glass-strong flex w-full shrink-0 items-center gap-2 rounded-none border-x-0 border-t-0 pl-3"
      style={{ height: TITLE_BAR_HEIGHT }}
    >
      <Logo />
      {leading}
      <div data-tauri-drag-region="" className="h-full flex-1" />
      {trailing}
      <WindowControls />
    </div>
  );
}
