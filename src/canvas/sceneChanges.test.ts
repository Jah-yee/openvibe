import { expect, it } from "vitest";
import { createChangeDetector } from "./sceneChanges";

it("reports a change only when the key differs from the last one", () => {
  const changed = createChangeDetector((version: number, zoom: number) => `${version}:${zoom}`);
  expect(changed(1, 1)).toBe(true);
  expect(changed(1, 1)).toBe(false); // pointer move: same scene, same viewport
  expect(changed(2, 1)).toBe(true); // element edited
  expect(changed(2, 1.5)).toBe(true); // zoomed
});

it("keeps separate state per detector", () => {
  const a = createChangeDetector((v: number) => String(v));
  const b = createChangeDetector((v: number) => String(v));
  a(1);
  expect(b(1)).toBe(true);
});
