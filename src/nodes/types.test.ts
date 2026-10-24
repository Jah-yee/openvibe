import { describe, expect, it } from "vitest";
import { readOrchestratorPayload, readTerminalPayload } from "./types";

describe("readTerminalPayload", () => {
  it("reads a payload saved before agents and names existed", () => {
    expect(readTerminalPayload({ title: "Claude Code · api", cwd: "C:/api", preset: "claude", command: "", shell: "cmd", claudeSessionId: "s1" })).toEqual({
      title: "Claude Code · api",
      name: "",
      agent: "claude",
      cwd: "C:/api",
      shell: "cmd",
      command: "",
      claudeSessionId: "s1",
    });
  });

  it("keeps a current payload as it is", () => {
    const payload = {
      title: "Ollama · api",
      name: "Isis",
      agent: "ollama",
      cwd: "C:/api",
      shell: "powershell",
      command: "",
      ollama: { model: "llama3", mode: "code" },
    };
    expect(readTerminalPayload(payload)).toEqual(payload);
  });

  it("rejects what cannot be launched", () => {
    expect(readTerminalPayload(null)).toBeNull();
    expect(readTerminalPayload({ agent: "vim", cwd: "C:/" })).toBeNull();
    expect(readTerminalPayload({ agent: "shell" })).toBeNull();
    expect(readTerminalPayload({ agent: "shell", cwd: "C:/", shell: "zsh" })?.shell).toBe("default");
  });
});

describe("readOrchestratorPayload", () => {
  it("keeps the given name and names the others Orchestrateur", () => {
    expect(readOrchestratorPayload({ name: "Chef" })).toEqual({ name: "Chef" });
    expect(readOrchestratorPayload({ name: "  " })).toEqual({ name: "Orchestrateur" });
    expect(readOrchestratorPayload({})).toEqual({ name: "Orchestrateur" });
    expect(readOrchestratorPayload(null)).toEqual({ name: "Orchestrateur" });
  });
});
