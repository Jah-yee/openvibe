// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { ptySendText, ptyWrite } from "@/ipc/pty";
import { freshText } from "@/nodes/terminal/registry";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore, terminalOf } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import { remoteDeps, remoteStore, setRemoteControl } from "./remoteControl";

vi.mock("@/ipc/pty", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/ipc/pty")>()), ptySendText: vi.fn(), ptyWrite: vi.fn() }));
vi.mock("@/nodes/terminal/registry", () => ({ freshText: vi.fn(), terminalText: vi.fn(() => "  /remote-control is active · https://claude.ai/code/session_OLD") }));

const URL = "https://claude.ai/code/session_NEW";
const PROMPT = ["──────────────────────", "❯ ", "──────────────────────"];
const ACTIVE = ["❯ /remote-control", "  /remote-control is active · Continue here, on your phone, or at", `  ${URL}`, ...PROMPT].join("\n");
const DISCONNECTED = ["❯ /remote-control", "  ⎿  Remote Control disconnected.", ...PROMPT].join("\n");
const menu = (choice: number) =>
  [
    "▔▔▔▔▔▔▔▔▔▔",
    "   Remote Control",
    `   This session is available at ${URL}.`,
    ...["Disconnect this session", "Show QR code", "Continue"].map((label, i) => (i === choice ? `   ❯ ${label}` : `     ${label}`)),
    "   Enter to select · Esc to continue",
  ].join("\n");

/** Claude Code as seen in the app: /remote-control turns it on, or opens its menu when on. */
let screen = "";
let typed: string[] = [];
function fakeClaude() {
  let on = false;
  let choice: number | null = null;
  screen = ["  Claude Code v2.1.304", ...PROMPT].join("\n");
  typed = [];
  vi.mocked(freshText).mockImplementation(() => screen);
  vi.mocked(ptySendText).mockImplementation(async (_id, text) => {
    typed.push(text);
    if (text !== "/remote-control") return;
    if (!on) {
      on = true;
      screen = ACTIVE;
    } else {
      choice = 2;
      screen = menu(choice);
    }
  });
  vi.mocked(ptyWrite).mockImplementation(async (_id, keys) => {
    typed.push(keys);
    if (choice === null) return;
    if (keys === "\x1b[A") choice = Math.max(0, choice - 1);
    if (keys === "\x1b") choice = null;
    if (keys === "\r" && choice === 0) {
      on = false;
      choice = null;
      screen = DISCONNECTED;
      return;
    }
    screen = choice === null ? ACTIVE : menu(choice);
  });
}

beforeEach(async () => {
  mockIPC(() => undefined);
  remoteDeps.sleep = () => Promise.resolve();
  fakeClaude();
  await nodesStore.getState().create("isis", {
    workspaceId: "w1",
    kind: "terminal",
    payload: { title: "Isis", name: "Isis", agent: "claude", cwd: "C:/code", shell: "default", command: "" },
  });
  terminalStatusStore.getState().set("isis", { state: "running" });
  agentActivityStore.getState().apply({ nodeId: "isis", activity: "idle", since: 0 });
  remoteStore.getState().set("isis", null);
});

describe("setRemoteControl on a running session (spec maj §2)", () => {
  it("reads the session's own screen, not what an earlier run left in the terminal", async () => {
    expect(await setRemoteControl("isis", true)).toEqual({ on: true, url: URL });
    expect(typed).toEqual(["/remote-control"]);
    expect(remoteStore.getState().links.isis).toEqual({ state: "on", url: URL });
    expect(terminalOf(nodesStore.getState().nodes.isis)?.remoteControl).toBe(true);
  });

  it("waits for the end of the agent's turn: Enter would answer its dialog (final review maj §2)", async () => {
    agentActivityStore.getState().apply({ nodeId: "isis", activity: "waiting", since: 1 });
    expect(await setRemoteControl("isis", true)).toEqual({ later: true });
    expect(typed).toEqual([]);
    expect(remoteStore.getState().links.isis?.state).toBe("pending");
    agentActivityStore.getState().apply({ nodeId: "isis", activity: "working", since: 2 });
    expect(typed).toEqual([]);
    agentActivityStore.getState().apply({ nodeId: "isis", activity: "idle", since: 3 });
    await vi.waitFor(() => expect(remoteStore.getState().links.isis).toEqual({ state: "on", url: URL }));
    expect(typed).toEqual(["/remote-control"]);
  });

  it("runs one flow at a time per session, the last wish winning (final review maj §2)", async () => {
    const results = await Promise.all([setRemoteControl("isis", true), setRemoteControl("isis", false)]);
    expect(results).toEqual([{ on: true, url: URL }, { on: false }]);
    expect(typed).toEqual(["/remote-control", "/remote-control", "\x1b[A", "\x1b[A", "\r"]);
    expect(remoteStore.getState().links.isis).toBeUndefined();
    expect(terminalOf(nodesStore.getState().nodes.isis)?.remoteControl).toBeUndefined();
  });
});
