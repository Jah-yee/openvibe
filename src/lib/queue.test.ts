import { expect, it } from "vitest";
import { createQueue } from "./queue";

it("starts each task only after the previous one settled", async () => {
  const enqueue = createQueue();
  const log: string[] = [];
  let release!: () => void;
  const first = enqueue(async () => {
    log.push("first:start");
    await new Promise<void>((resolve) => (release = resolve));
    log.push("first:end");
  });
  const second = enqueue(async () => {
    log.push("second");
  });
  await Promise.resolve();
  expect(log).toEqual(["first:start"]);
  release();
  await Promise.all([first, second]);
  expect(log).toEqual(["first:start", "first:end", "second"]);
});

it("keeps going after a failed task", async () => {
  const enqueue = createQueue();
  await expect(enqueue(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  await expect(enqueue(async () => "next")).resolves.toBe("next");
});
