import { useEffect, useRef } from "react";
import { diagnostics } from "./diagnostics";
import { getSpikeTerminal, mountInto } from "./registry";

// Throwaway (milestone 2 prototype): an xterm with local echo inside an embeddable.
export function SpikeTerminal({ nodeId }: { nodeId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const entry = getSpikeTerminal(nodeId);
    mountInto(entry, host, nodeId);
    const observer = new ResizeObserver(() => entry.fit.fit());
    observer.observe(host);
    // Native listener: stops keys from bubbling to Excalidraw's document handlers
    // when the "block propagation" toggle is on (criterion 2 fallback).
    const stopKeys = (event: KeyboardEvent) => {
      if (diagnostics.getState().blockKeyPropagation) event.stopPropagation();
    };
    host.addEventListener("keydown", stopKeys);
    return () => {
      observer.disconnect();
      host.removeEventListener("keydown", stopKeys);
    };
  }, [nodeId]);

  return <div ref={hostRef} className="h-full w-full bg-[#1e1e1e] p-1" />;
}
