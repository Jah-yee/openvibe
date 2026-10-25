import { createStore, useStore } from "zustand";

interface ArrivalState {
  /** The terminal that arrived last. */
  nodeId: string | null;
  /** Counts arrivals: a new value restarts the flash. */
  seq: number;
}

export const arrivalStore = createStore<ArrivalState>()(() => ({ nodeId: null, seq: 0 }));

/** The arriving terminal's border takes the accent, then fades back (spec fenêtre §6.4). */
export function signalArrival(nodeId: string) {
  arrivalStore.setState((state) => ({ nodeId, seq: state.seq + 1 }));
}

/** The flash of `nodeId`, as a key that changes on every arrival; null when another terminal arrived last. */
export function useArrivalSignal(nodeId: string): number | null {
  return useStore(arrivalStore, (state) => (state.nodeId === nodeId ? state.seq : null));
}
