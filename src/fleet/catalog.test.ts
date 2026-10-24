import { describe, expect, it } from "vitest";
import { AGENT_IDS } from "@/ipc/pty";
import { AGENT_ORDER, AGENTS, defaultAgent } from "./catalog";

describe("agent catalog", () => {
  it("describes every agent, in menu order", () => {
    expect(AGENT_ORDER).toEqual([...AGENT_IDS]);
    for (const id of AGENT_IDS) expect(AGENTS[id].label).not.toBe("");
  });

  it("picks Claude, then Codex, then Shell as the default agent", () => {
    const info = (...ids: string[]) =>
      AGENT_IDS.map((id) => ({ id, available: ids.includes(id) || id === "shell" || id === "custom" }));
    expect(defaultAgent(info("claude", "codex"))).toBe("claude");
    expect(defaultAgent(info("codex"))).toBe("codex");
    expect(defaultAgent(info())).toBe("shell");
    expect(defaultAgent([])).toBe("shell");
  });
});
