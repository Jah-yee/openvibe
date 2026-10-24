import { getCurrentWindow } from "@tauri-apps/api/window";
import { onPtyExit, ptyList } from "@/ipc/pty";
import { setLivePtys } from "@/nodes/terminal/registry";
import { terminalStatusStore } from "@/store/terminalStatus";
import { projectsStore, setForgetWorkspaces } from "@/store/projects";
import { saveBeforeClose } from "./close";
import { forgetWorkspaces } from "./forget";

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
    await getCurrentWindow().onCloseRequested(saveBeforeClose);
    setForgetWorkspaces(forgetWorkspaces);
    await projectsStore.getState().init();
  })();
  return booting;
}
