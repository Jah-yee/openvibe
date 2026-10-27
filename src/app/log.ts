import { error as logError, warn as logWarn } from "@tauri-apps/plugin-log";

export interface LogTarget {
  warn: (message: string) => Promise<void>;
  error: (message: string) => Promise<void>;
}

const text = (values: unknown[]) => values.map((value) => (value instanceof Error ? `${value.name}: ${value.message}` : String(value))).join(" ");

/**
 * Console warnings and errors, uncaught errors and unhandled rejections also go
 * to the log file a user can send (spec première version §3.6). Writing to the
 * file never fails the caller.
 */
export function installLogging(target: LogTarget = { warn: logWarn, error: logError }, cons: Console = console, win: Window = window) {
  const write = (level: keyof LogTarget, message: string) => void target[level](message).catch(() => undefined);
  for (const level of ["warn", "error"] as const) {
    const original = cons[level].bind(cons);
    cons[level] = (...values: unknown[]) => {
      original(...values);
      write(level, text(values));
    };
  }
  win.addEventListener("error", (event) => {
    const { error, message } = event as ErrorEvent;
    write("error", `uncaught: ${text([error ?? message])}`);
  });
  win.addEventListener("unhandledrejection", (event) => write("error", `unhandled rejection: ${text([(event as PromiseRejectionEvent).reason])}`));
}
