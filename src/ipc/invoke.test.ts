// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { AppError, call } from "./invoke";

afterEach(() => clearMocks());

it("returns the command result", async () => {
  mockIPC((cmd) => (cmd === "ping" ? "pong" : undefined));
  await expect(call<string>("ping")).resolves.toBe("pong");
});

it("turns a Rust AppError payload into an AppError instance", async () => {
  mockIPC(() => {
    throw { kind: "notFound", message: "dossier introuvable" };
  });
  const error = await call("pty_write").catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ kind: "notFound", message: "dossier introuvable" });
});

it("wraps unexpected failures as io errors", async () => {
  mockIPC(() => {
    throw "boom";
  });
  await expect(call("ping")).rejects.toMatchObject({ kind: "io", message: "boom" });
});
