import { expect, it, vi } from "vitest";
import { installLogging } from "./log";

function recorder() {
  const sent: [string, string][] = [];
  return {
    sent,
    target: {
      warn: (message: string) => (sent.push(["warn", message]), Promise.resolve()),
      error: (message: string) => (sent.push(["error", message]), Promise.resolve()),
    },
  };
}

it("sends console warnings and errors to the log file, and keeps them in the console", () => {
  const { sent, target } = recorder();
  const original = vi.fn();
  const fakeConsole = { warn: original, error: original } as unknown as Console;
  installLogging(target, fakeConsole, new EventTarget() as unknown as Window);
  fakeConsole.warn("projects not refreshed", new Error("offline"));
  fakeConsole.error("boom");
  expect(sent).toEqual([
    ["warn", "projects not refreshed Error: offline"],
    ["error", "boom"],
  ]);
  expect(original).toHaveBeenCalledTimes(2);
});

it("logs uncaught errors and unhandled rejections", () => {
  const { sent, target } = recorder();
  const win = new EventTarget() as unknown as Window;
  installLogging(target, { warn: vi.fn(), error: vi.fn() } as unknown as Console, win);
  win.dispatchEvent(Object.assign(new Event("error"), { error: new Error("render") }));
  win.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: "nope" }));
  expect(sent).toEqual([
    ["error", "uncaught: Error: render"],
    ["error", "unhandled rejection: nope"],
  ]);
});

it("keeps working when the log file cannot be written", async () => {
  const fakeConsole = { warn: vi.fn(), error: vi.fn() } as unknown as Console;
  installLogging({ warn: () => Promise.reject(new Error("no ipc")), error: () => Promise.reject(new Error("no ipc")) }, fakeConsole, new EventTarget() as unknown as Window);
  expect(() => fakeConsole.error("still shown")).not.toThrow();
  await Promise.resolve();
});
