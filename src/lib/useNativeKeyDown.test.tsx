// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { useNativeKeyDown } from "./useNativeKeyDown";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("handles the keys typed in a field and keeps them from the canvas around it", async () => {
  const canvas = document.createElement("div");
  document.body.append(canvas);
  const seenByCanvas: string[] = [];
  canvas.addEventListener("keydown", (e) => seenByCanvas.push(e.key));
  const handled: string[] = [];

  function Field() {
    const ref = useRef<HTMLInputElement>(null);
    useNativeKeyDown(ref, (e) => handled.push(e.key));
    return <input ref={ref} />;
  }

  const root = createRoot(canvas);
  await act(async () => root.render(<Field />));
  for (const key of ["Escape", "Backspace", "a"]) {
    canvas.querySelector("input")!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }
  expect(handled).toEqual(["Escape", "Backspace", "a"]);
  expect(seenByCanvas).toEqual([]);
  await act(async () => root.unmount());
  canvas.remove();
});
