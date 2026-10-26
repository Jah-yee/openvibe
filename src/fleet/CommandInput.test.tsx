// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { sendCommand } from "./broadcast";
import { CommandInput } from "./CommandInput";
import type { TargetAgent } from "./targets";

vi.mock("./broadcast", () => ({ sendCommand: vi.fn(() => Promise.resolve()) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const agents: TargetAgent[] = [
  { id: "b", name: "Thot", groupName: null },
  { id: "d", name: "Zeus", groupName: null },
  { id: "h", name: "Héra", groupName: null },
];

let root: Root;
let host: HTMLDivElement;

beforeEach(async () => {
  mockIPC(() => undefined);
  vi.mocked(sendCommand).mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<CommandInput agents={agents} groups={[]} fallback={[]} placeholder="Consigne" emptyHint="Tape @" />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  clearMocks();
  document.body.replaceChildren();
});

const field = () => host.querySelector("textarea")!;
const options = () => [...host.querySelectorAll('[role="option"]')].map((o) => o.textContent);
const chips = () => [...host.querySelectorAll("span.rounded-full")].map((c) => c.textContent);

async function type(value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(field(), value);
    field().setSelectionRange(value.length, value.length);
    field().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function press(key: string) {
  await act(async () => {
    field().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

it("suggests Claude Code's commands after the targets, and Tab completes one", async () => {
  await type("@thot /ef");
  expect(options()).toEqual([expect.stringContaining("/effort")]);
  await press("Tab");
  expect(field().value).toBe("@thot /effort ");
  expect(options()).toEqual([]);
});

it("completes the last name of @thot/ze, the names before it becoming targets too", async () => {
  await type("@thot/ze");
  expect(options()).toEqual([expect.stringContaining("@zeus")]);
  await press("Tab");
  expect(chips()).toEqual(["@thot", "@zeus"]);
  expect(field().value).toBe("");
});

it("sends a /command to every agent of @thot/zeus/héra", async () => {
  await type("@thot/zeus/héra /effort ultracode");
  await press("Enter");
  expect(sendCommand).toHaveBeenCalledWith(["b", "d", "h"], "/effort ultracode");
});
