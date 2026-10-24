import { describe, expect, it } from "vitest";
import { pillOf, resumeOfferOf, startsOnKeystroke } from "./pill";

describe("pillOf", () => {
  it("labels each process state (spec habillage §7.2)", () => {
    expect(pillOf({ state: "running" })).toEqual({ label: "ACTIF", tone: "live" });
    expect(pillOf({ state: "stopped" })).toEqual({ label: "ARRÊTÉ", tone: "stopped" });
    expect(pillOf({ state: "exited", code: 0 })).toEqual({ label: "TERMINÉ · 0", tone: "done" });
    expect(pillOf({ state: "exited", code: 2 })).toEqual({ label: "TERMINÉ · 2", tone: "failed" });
    expect(pillOf({ state: "exited", code: null })).toEqual({ label: "TERMINÉ", tone: "done" });
    expect(pillOf({ state: "error", message: "x" })).toEqual({ label: "ERREUR", tone: "failed" });
  });
});

describe("resumeOfferOf", () => {
  it("offers to resume a Claude conversation, to relaunch anything else, never while running", () => {
    expect(resumeOfferOf({ state: "stopped" }, "claude", true)).toBe("resume");
    expect(resumeOfferOf({ state: "stopped" }, "claude", false)).toBe("relaunch");
    expect(resumeOfferOf({ state: "exited", code: 0 }, "codex", false)).toBe("relaunch");
    expect(resumeOfferOf({ state: "running" }, "claude", true)).toBeNull();
  });
});

describe("startsOnKeystroke", () => {
  it("starts a terminal from the keyboard only when nothing runs in it", () => {
    expect(startsOnKeystroke({ state: "stopped" })).toBe(true);
    expect(startsOnKeystroke({ state: "exited", code: 1 })).toBe(true);
    expect(startsOnKeystroke({ state: "error", message: "x" })).toBe(true);
    expect(startsOnKeystroke({ state: "running" })).toBe(false);
  });
});
