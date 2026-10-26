// @vitest-environment happy-dom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { nodesStore, terminalOf } from "@/store/nodes";
import { answer } from "./router";

vi.mock("@excalidraw/excalidraw", () => ({}));

const call = (nodeId: string, name: string, args: Record<string, unknown>) =>
  answer({ callId: 1, nodeId, method: "tools/call", params: { name, arguments: args } });
const textOf = (result: unknown) => (result as { content: { text: string }[] }).content[0].text;

beforeAll(async () => {
  mockIPC(() => undefined);
  await nodesStore.getState().create("isis", {
    workspaceId: "w1",
    kind: "terminal",
    payload: { title: "", name: "Isis", agent: "claude", cwd: "C:/code", shell: "default", command: "" },
  });
  await nodesStore.getState().create("chef", { workspaceId: "w1", kind: "orchestrator", payload: { name: "chef" } });
});

describe("the agent's tools (spec orchestrateur §4.4)", () => {
  it("lists them for any Claude session", async () => {
    const list = (await answer({ callId: 1, nodeId: "isis", method: "tools/list", params: {} })) as { tools: { name: string; inputSchema: object }[] };
    expect(list.tools.map((t) => t.name)).toEqual(["declarer_etapes", "etape", "rendre_compte"]);
    expect(list.tools.every((t) => typeof t.inputSchema === "object")).toBe(true);
  });

  it("declares and marks the terminal's steps, saved in its payload", async () => {
    expect(textOf(await call("isis", "declarer_etapes", { etapes: ["Plan", "Code"] }))).toBe("2 étapes déclarées.");
    expect(textOf(await call("isis", "etape", { titre: "Plan", etat: "fait" }))).toBe("Plan : fait.");
    expect(terminalOf(nodesStore.getState().nodes.isis)?.steps).toEqual([
      { title: "Plan", state: "fait" },
      { title: "Code", state: "a_venir" },
    ]);
  });

  it("answers mistakes with a readable error, the payload untouched", async () => {
    const before = terminalOf(nodesStore.getState().nodes.isis)?.steps;
    const wrong = (await call("isis", "etape", { titre: "Plan", etat: "fini" })) as { isError?: boolean };
    expect(wrong.isError).toBe(true);
    expect((await call("isis", "declarer_etapes", {})) as { isError?: boolean }).toMatchObject({ isError: true });
    expect(textOf(await call("isis", "voler", {}))).toBe("Outil inconnu : voler");
    expect(textOf(await call("gone", "etape", { titre: "Plan", etat: "fait" }))).toBe("Ce terminal n'est plus sur le canvas.");
    expect(textOf(await call("chef", "etape", { titre: "Plan", etat: "fait" }))).toBe("Ce terminal n'est plus sur le canvas.");
    expect(terminalOf(nodesStore.getState().nodes.isis)?.steps).toEqual(before);
  });

  it("says there is no mission to report to, outside one", async () => {
    expect(textOf(await call("isis", "rendre_compte", { resume: "Fait", statut: "termine" }))).toBe("Pas de mission en cours : rien à transmettre.");
  });
});
