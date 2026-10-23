import { createStore, useStore } from "zustand";

// Throwaway (milestone 2 prototype): an on-screen log so criteria can be checked
// without opening devtools. Deleted once the go/no-go decision is recorded.
interface DiagnosticsState {
  lines: string[];
  blockKeyPropagation: boolean;
  log: (line: string) => void;
  setBlockKeyPropagation: (value: boolean) => void;
}

export const diagnostics = createStore<DiagnosticsState>()((set) => ({
  lines: [],
  blockKeyPropagation: false,
  log: (line) =>
    set((s) => ({ lines: [`${new Date().toLocaleTimeString()} ${line}`, ...s.lines].slice(0, 40) })),
  setBlockKeyPropagation: (value) => set({ blockKeyPropagation: value }),
}));

export const log = (line: string) => diagnostics.getState().log(line);

export function useDiagnostics<T>(selector: (s: DiagnosticsState) => T): T {
  return useStore(diagnostics, selector);
}
