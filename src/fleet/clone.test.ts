import { describe, expect, it } from "vitest";
import type { TerminalPayload } from "@/nodes/types";
import { cloneTerminalPayload } from "./clone";

const claude: TerminalPayload = {
  title: "Claude · api",
  name: "Isis",
  agent: "claude",
  cwd: "C:/api",
  shell: "cmd",
  command: "",
  claudeSessionId: "s1",
};

describe("cloneTerminalPayload", () => {
  it("keeps agent, folder and shell; gives a new name and a new conversation", () => {
    const copy = cloneTerminalPayload(claude, "Osiris");
    expect(copy).toMatchObject({ title: "Claude · api", agent: "claude", cwd: "C:/api", shell: "cmd", name: "Osiris" });
    expect(copy.claudeSessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(copy.claudeSessionId).not.toBe("s1");
  });

  it("gives no conversation to other agents", () => {
    const copy = cloneTerminalPayload({ ...claude, agent: "codex", claudeSessionId: undefined }, "Horus");
    expect(copy.claudeSessionId).toBeUndefined();
  });
});
