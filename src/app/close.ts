import { flushAll } from "@/lib/flush";

/**
 * Runs when the window is asked to close, before it is destroyed. A field being
 * edited (a terminal or workspace title) saves on blur, but WebView2 does not
 * blur it when the window closes, so it is blurred here first.
 */
export async function saveBeforeClose(): Promise<void> {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  await flushAll();
}
