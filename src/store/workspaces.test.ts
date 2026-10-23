// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import type { Workspace } from "@/ipc/db";
import { createWorkspacesStore, nextDefaultName } from "./workspaces";

/** In-memory stand-in for the Rust workspace commands. */
function fakeBackend(initial: string[] = [], activeSetting: string | null = null) {
  let counter = 0;
  const db = {
    workspaces: initial.map((name, position) => ({ id: `w${++counter}`, name, position })) as Workspace[],
    settings: new Map<string, unknown>(activeSetting ? [["ui.activeWorkspaceId", activeSetting]] : []),
  };
  mockIPC((cmd, raw) => {
    const args = raw as Record<string, string>;
    switch (cmd) {
      case "list_workspaces":
        return [...db.workspaces]; // real IPC hands out copies, never the backend's array
      case "create_workspace": {
        const w = { id: `w${++counter}`, name: args.name, position: db.workspaces.length };
        db.workspaces.push(w);
        return w;
      }
      case "rename_workspace":
        db.workspaces = db.workspaces.map((w) => (w.id === args.id ? { ...w, name: args.name } : w));
        return;
      case "delete_workspace":
        db.workspaces = db.workspaces.filter((w) => w.id !== args.id);
        return;
      case "get_setting":
        return db.settings.get(args.key) ?? null;
      case "set_setting":
        db.settings.set(args.key, (raw as { value: unknown }).value);
        return;
    }
  });
  return db;
}

let store: ReturnType<typeof createWorkspacesStore>;
const state = () => store.getState();
const names = () => state().workspaces.map((w) => w.name);
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  store = createWorkspacesStore();
});
afterEach(() => clearMocks());

describe("nextDefaultName", () => {
  it("uses the smallest free number", () => {
    const ws = (...n: string[]) => n.map((name, i) => ({ id: String(i), name, position: i }));
    expect(nextDefaultName([])).toBe("Workspace 1");
    expect(nextDefaultName(ws("Workspace 2"))).toBe("Workspace 1");
    expect(nextDefaultName(ws("Workspace 1", "Workspace 2"))).toBe("Workspace 3");
  });
});

describe("workspaces store", () => {
  it("creates the first workspace on a fresh install", async () => {
    const db = fakeBackend();
    await state().init();
    expect(names()).toEqual(["Workspace 1"]);
    expect(db.workspaces).toHaveLength(1);
    expect(state().status).toBe("ready");
  });

  it("reopens the workspace that was active last time", async () => {
    fakeBackend(["A", "B"], "w2");
    await state().init();
    expect(state().activeId).toBe("w2");
  });

  it("falls back to the first workspace when the saved one is gone", async () => {
    fakeBackend(["A"], "deleted");
    await state().init();
    expect(state().activeId).toBe("w1");
  });

  it("creates a workspace, makes it active and remembers it", async () => {
    const db = fakeBackend(["Workspace 1"]);
    await state().init();
    await state().create();
    await settled();
    expect(names()).toEqual(["Workspace 1", "Workspace 2"]);
    expect(db.settings.get("ui.activeWorkspaceId")).toBe(state().activeId);
  });

  it("renames with trimming and ignores blank names", async () => {
    const db = fakeBackend(["A"]);
    await state().init();
    await state().rename("w1", "  Front  ");
    await state().rename("w1", "   ");
    expect(names()).toEqual(["Front"]);
    expect(db.workspaces[0].name).toBe("Front");
  });

  it("never removes the last workspace", async () => {
    const db = fakeBackend(["A"]);
    await state().init();
    await state().remove("w1");
    expect(names()).toEqual(["A"]);
    expect(db.workspaces).toHaveLength(1);
  });

  it("selects the next workspace when the active one is removed, or the previous when it was last", async () => {
    fakeBackend(["A", "B", "C"]);
    await state().init();
    state().select("w2");
    await state().remove("w2");
    expect(state().activeId).toBe("w3");
    await state().remove("w3");
    expect(state().activeId).toBe("w1");
  });

  it("reports a backend failure at startup", async () => {
    mockIPC(() => {
      throw { kind: "db", message: "disk I/O error" };
    });
    await state().init();
    expect(state().status).toBe("error");
    expect(state().error).toContain("disk I/O error");
  });
});
