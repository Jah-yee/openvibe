import { beforeEach, describe, expect, it } from "vitest";
import { createWorkspacesStore } from "./workspaces";

let store: ReturnType<typeof createWorkspacesStore>;
const state = () => store.getState();
const names = () => state().workspaces.map((w) => w.name);

beforeEach(() => {
  store = createWorkspacesStore();
});

describe("workspaces store", () => {
  it("starts with one active workspace", () => {
    expect(names()).toEqual(["Workspace 1"]);
    expect(state().activeId).toBe(state().workspaces[0].id);
  });

  it("creates a workspace, numbers it and makes it active", () => {
    const id = state().create();
    expect(names()).toEqual(["Workspace 1", "Workspace 2"]);
    expect(state().activeId).toBe(id);
    state().create("  API  ");
    expect(names()[2]).toBe("API");
  });

  it("renames with trimming and ignores blank names", () => {
    const id = state().activeId;
    state().rename(id, "  Front  ");
    state().rename(id, "   ");
    expect(names()).toEqual(["Front"]);
  });

  it("never removes the last workspace", () => {
    state().remove(state().activeId);
    expect(names()).toEqual(["Workspace 1"]);
  });

  it("selects the next workspace when the active one is removed, or the previous when it was last", () => {
    const [a] = state().workspaces;
    const b = state().create();
    const c = state().create();
    state().select(b);
    state().remove(b);
    expect(state().activeId).toBe(c);
    state().remove(c);
    expect(state().activeId).toBe(a.id);
  });

  it("keeps the active workspace when another one is removed and drops its scene", () => {
    const a = state().activeId;
    const b = state().create();
    state().saveScene(b, { elements: [], appState: { scrollX: 0, scrollY: 0, zoom: { value: 1 as never } } });
    state().select(a);
    state().remove(b);
    expect(state().activeId).toBe(a);
    expect(state().scenes[b]).toBeUndefined();
  });

  it("ignores selection of an unknown workspace", () => {
    const before = state().activeId;
    state().select("nope");
    expect(state().activeId).toBe(before);
  });
});
