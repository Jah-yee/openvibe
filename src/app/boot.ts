import { getCurrentWindow } from "@tauri-apps/api/window";
import { onPtyExit, ptyList } from "@/ipc/pty";
import { flushAll } from "@/lib/flush";
import { setLivePtys } from "@/nodes/terminal/registry";
import { terminalStatusStore } from "@/store/terminalStatus";
import { workspacesStore } from "@/store/workspaces";

let booting: Promise<void> | undefined;

/**
 * Starts the app once (React's StrictMode runs effects twice in development).
 * Order matters: exits are listened to before any terminal starts, and running
 * sessions are known before any terminal node mounts.
 */
export function boot(): Promise<void> {
  booting ??= (async () => {
    await onPtyExit(({ nodeId, exitCode }) =>
      terminalStatusStore.getState().set(nodeId, { state: "exited", code: exitCode }),
    );
    setLivePtys(await ptyList());
    await getCurrentWindow().onCloseRequested(async () => {
      await flushAll();
    });
    await workspacesStore.getState().init();
  })();
  return booting;
}
