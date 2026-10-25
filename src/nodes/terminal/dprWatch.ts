/**
 * Calls `onChange` each time the device pixel ratio changes: the window moved
 * to a monitor with another scaling, or Windows' scaling changed. A media
 * query only matches one ratio, so a new one is watched after each change.
 * Returns a function that stops watching.
 */
export function watchDevicePixelRatio(
  win: Pick<Window, "devicePixelRatio" | "matchMedia">,
  onChange: () => void,
): () => void {
  let query: MediaQueryList | null = null;
  const fire = () => {
    listen();
    onChange();
  };
  const listen = () => {
    query?.removeEventListener("change", fire);
    query = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
    query.addEventListener("change", fire);
  };
  listen();
  return () => query?.removeEventListener("change", fire);
}
