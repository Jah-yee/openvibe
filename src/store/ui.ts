import { createStore, useStore } from "zustand";

interface UiState {
  /** The terminal launch dialog (replaced by the agent menu in task 14). */
  launchOpen: boolean;
  setLaunchOpen: (open: boolean) => void;
}

export const uiStore = createStore<UiState>()((set) => ({
  launchOpen: false,
  setLaunchOpen: (launchOpen) => set({ launchOpen }),
}));

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector);
}
