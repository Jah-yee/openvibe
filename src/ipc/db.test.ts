// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { flushAll } from "@/lib/flush";
import { saveFiles, saveNode, saveScene } from "./db";

afterEach(() => clearMocks());

it("never lets a scene save overtake a node save sent before it", async () => {
  const started: string[] = [];
  let release!: () => void;
  mockIPC((cmd) => {
    started.push(cmd);
    if (cmd === "save_node") return new Promise<void>((resolve) => (release = resolve));
  });
  const node = saveNode("n1", "w1", "terminal", "{}");
  const scene = saveScene("w1", "[]", "{}", ["n1"]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(started).toEqual(["save_node"]);
  release();
  await Promise.all([node, scene]);
  expect(started).toEqual(["save_node", "save_scene"]);
});

it("flushing before close waits for writes already in the queue", async () => {
  let release!: () => void;
  mockIPC((cmd) => {
    if (cmd === "save_files") return new Promise<void>((resolve) => (release = resolve));
  });
  void saveFiles("w1", []);
  let flushed = false;
  const flushing = flushAll().then(() => (flushed = true));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(flushed).toBe(false);
  release();
  await flushing;
  expect(flushed).toBe(true);
});

it("sends camelCase arguments", async () => {
  let received: unknown;
  mockIPC((cmd, args) => {
    received = { cmd, args };
  });
  await saveScene("w1", "[1]", '{"zoom":1}', ["a"]);
  expect(received).toEqual({
    cmd: "save_scene",
    args: { workspaceId: "w1", elementsJson: "[1]", appStateJson: '{"zoom":1}', nodeIds: ["a"] },
  });
});
