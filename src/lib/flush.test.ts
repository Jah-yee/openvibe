import { expect, it, vi } from "vitest";
import { flushAll, onFlushAll } from "./flush";

it("waits for every registered flush, even when one fails", async () => {
  let saved = false;
  const off1 = onFlushAll(async () => {
    await Promise.resolve();
    saved = true;
  });
  const off2 = onFlushAll(() => Promise.reject(new Error("disk full")));
  await flushAll();
  expect(saved).toBe(true);
  off1();
  off2();
});

it("stops calling a flush once unregistered", async () => {
  const flush = vi.fn();
  const off = onFlushAll(flush);
  off();
  await flushAll();
  expect(flush).not.toHaveBeenCalled();
});
