import { afterEach, expect, it, vi } from "vitest";
import { isRunning, statusOf, terminalStatusStore, waitForExit } from "./terminalStatus";

afterEach(() => {
  terminalStatusStore.setState({ statuses: {} });
  vi.useRealTimers();
});

it("treats an unknown terminal as stopped", () => {
  expect(statusOf("x")).toEqual({ state: "stopped" });
  expect(isRunning("x")).toBe(false);
});

it("waitForExit resolves when the terminal leaves the running state", async () => {
  terminalStatusStore.getState().set("t", { state: "running" });
  let exited = false;
  const wait = waitForExit("t").then(() => (exited = true));
  await Promise.resolve();
  expect(exited).toBe(false);
  terminalStatusStore.getState().set("t", { state: "exited", code: 0 });
  await wait;
  expect(exited).toBe(true);
});

it("waitForExit gives up after the timeout", async () => {
  vi.useFakeTimers();
  terminalStatusStore.getState().set("t", { state: "running" });
  const wait = waitForExit("t", 100);
  await vi.advanceTimersByTimeAsync(100);
  await expect(wait).resolves.toBeUndefined();
});
