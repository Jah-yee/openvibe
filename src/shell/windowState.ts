import { getCurrentWindow } from "@tauri-apps/api/window";
import { toast } from "sonner";
import { createStore } from "zustand";

/** Whether the window is maximized, kept by the window buttons: « Agrandir » or « Restaurer » in the palette. */
export const windowStore = createStore<{ maximized: boolean }>()(() => ({ maximized: false }));

function perform(action: () => Promise<void>, failure: string) {
  void action().catch((error: unknown) => toast.error(`${failure} : ${String(error)}`));
}

export function minimizeWindow() {
  perform(() => getCurrentWindow().minimize(), "Réduction impossible");
}

export function toggleMaximizeWindow() {
  const failure = windowStore.getState().maximized ? "Restauration impossible" : "Agrandissement impossible";
  perform(() => getCurrentWindow().toggleMaximize(), failure);
}

/** close, not destroy: onCloseRequested saves first (src/app/close.ts). */
export function closeWindow() {
  perform(() => getCurrentWindow().close(), "Fermeture impossible");
}
