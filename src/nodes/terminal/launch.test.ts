import { describe, expect, it } from "vitest";
import { buildSpawnSpec, defaultTitle, newTerminalPayload } from "./launch";

const base = { title: "", cwd: "C:\\code\\openvibe", preset: "shell" as const, command: "", shell: "default" as const };

describe("defaultTitle", () => {
  it("names the terminal after the preset and the folder", () => {
    expect(defaultTitle("claude", "C:\\code\\openvibe\\")).toBe("Claude Code · openvibe");
    expect(defaultTitle("shell", "/home/me/api")).toBe("Shell · api");
    expect(defaultTitle("aider", "")).toBe("Aider");
  });
});

describe("newTerminalPayload", () => {
  it("fills a blank title and trims the custom command", () => {
    const payload = newTerminalPayload({ ...base, preset: "custom", command: "  npm run dev " });
    expect(payload.title).toBe("Personnalisé · openvibe");
    expect(payload.command).toBe("npm run dev");
    expect(payload.claudeSessionId).toBeUndefined();
  });

  it("gives every Claude terminal its own session id", () => {
    const a = newTerminalPayload({ ...base, preset: "claude", title: "Agent" });
    const b = newTerminalPayload({ ...base, preset: "claude", title: "Agent" });
    expect(a.claudeSessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.claudeSessionId).not.toBe(b.claudeSessionId);
    expect(a.title).toBe("Agent");
  });
});

describe("buildSpawnSpec", () => {
  it("passes Claude options with the requested mode", () => {
    const payload = newTerminalPayload({ ...base, preset: "claude", title: "Agent" });
    expect(buildSpawnSpec(payload, "resume")).toEqual({
      cwd: base.cwd,
      shell: "default",
      preset: "claude",
      command: "",
      claude: { mode: "resume", sessionId: payload.claudeSessionId, title: "Agent" },
    });
  });

  it("sends no Claude options for other presets", () => {
    expect(buildSpawnSpec(newTerminalPayload(base), "new").claude).toBeUndefined();
  });
});
