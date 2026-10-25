// @vitest-environment happy-dom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { canvasStore } from "@/canvas/canvasStore";
import { agentActivityStore } from "@/store/agentActivity";
import { nodesStore } from "@/store/nodes";
import { terminalStatusStore } from "@/store/terminalStatus";
import type { CommandContext } from "./command";
import { functionSections } from "./functions";
import { COMMANDS } from "./registry";

vi.mock("@excalidraw/excalidraw", () => ({}));

const fromIsis: CommandContext = { project: true, workspaceId: "w1", terminalCount: 1, terminalId: "isis" };
const chosen = (query: string) => functionSections(COMMANDS, fromIsis, query)[0]?.items[0];

beforeAll(async () => {
  mockIPC(() => undefined);
  await nodesStore.getState().create("isis", {
    workspaceId: "w1",
    kind: "terminal",
    payload: { title: "Isis", name: "Isis", agent: "claude", cwd: "C:/code", shell: "default", command: "", claudeSessionId: "s1" },
  });
  canvasStore.setState({
    frames: [{ id: "g1", name: "Backend", x: 0, y: 0, width: 10, height: 10, group: { role: "backend", pantheon: "egypt" }, memberIds: ["isis"] }],
  });
  terminalStatusStore.getState().set("isis", { state: "running" });
  agentActivityStore.getState().apply({ nodeId: "isis", activity: "working", since: 0 });
});

describe("the line chosen by a search, from a Claude terminal (retours J8b)", () => {
  it("is the function of the terminal of the moment, not a loose match in an earlier section", () => {
    expect(chosen("pause")).toMatchObject({ label: "Mettre en pause", section: "Terminal · Isis" });
    expect(chosen("relancer")).toMatchObject({ label: "Relancer", section: "Terminal · Isis" });
    expect(chosen("renommer")).toMatchObject({ label: "Renommer", section: "Terminal · Isis" });
  });

  it("still finds the others by their own words", () => {
    expect(chosen("renommer le workspace")?.label).toBe("Renommer le workspace");
    expect(chosen("tout pause")?.label).toBe("Tout mettre en pause");
    expect(chosen("lancer claude")?.label).toBe("Lancer Claude");
  });
});
