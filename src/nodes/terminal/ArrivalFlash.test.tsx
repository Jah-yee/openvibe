// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { signalArrival } from "@/canvas/arrivalSignal";
import { readSource } from "@/theme/cssBlocks";
import { ArrivalFlash } from "./ArrivalFlash";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("flashes the border of the terminal that arrives, anew on each arrival (spec fenêtre §6.4)", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <>
        <div data-node="isis">
          <ArrivalFlash nodeId="isis" />
        </div>
        <div data-node="thot">
          <ArrivalFlash nodeId="thot" />
        </div>
      </>,
    ),
  );
  expect(host.querySelector("[data-arrival]")).toBeNull();
  await act(async () => signalArrival("isis"));
  const first = host.querySelector('[data-node="isis"] [data-arrival]')!;
  expect(first.className).toContain("ov-arrival");
  expect(host.querySelector('[data-node="thot"] [data-arrival]')).toBeNull();
  await act(async () => signalArrival("isis"));
  // A new element restarts the animation.
  expect(host.querySelector('[data-node="isis"] [data-arrival]')).not.toBe(first);
  await act(async () => signalArrival("thot"));
  expect(host.querySelector('[data-node="isis"] [data-arrival]')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

it("fades the accent back in 600 ms, inside every terminal", () => {
  expect(readSource("index.css")).toMatch(/@keyframes ov-arrival \{[^}]*var\(--ov-accent\)/);
  expect(readSource("index.css")).toMatch(/\.ov-arrival \{[^}]*ov-arrival 600ms/);
  expect(readSource("nodes/terminal/TerminalNode.tsx")).toContain("<ArrivalFlash nodeId={nodeId} />");
});
