import { describe, expect, it } from "vitest";
import { co2Grams, limitTone, readStatus, totals, formatUsd, type SessionUsage } from "./usage";

/** A status line's JSON as Claude Code 2.1.304 sent it in OpenVibe, after one answer. */
const STATUS = {
  session_id: "s1",
  model: { id: "claude-haiku-5-5", display_name: "Haiku 5.5" },
  cost: { total_api_duration_ms: 1588, total_cost_usd: 0.00738418, total_duration_ms: 26007, total_lines_added: 3, total_lines_removed: 1 },
  context_window: { total_input_tokens: 67785, total_output_tokens: 4, used_percentage: 7 },
  rate_limits: { five_hour: { resets_at: 1793069400, used_percentage: 29 }, seven_day: { resets_at: 1793311200, used_percentage: 53 } },
  prompt_cache: { warm: true, hit_ratio: 0.479, expires_at: 1793061229, ttl: "1h", requests: 1, cache_write_tokens: 35285 },
  effort: { level: "medium" },
};

describe("readStatus (spec maj §6)", () => {
  it("reads a session's usage and the plan's limits", () => {
    const { session, limits } = readStatus(STATUS, "isis", 1000);
    expect(session).toEqual({
      sessionId: "s1",
      nodeId: "isis",
      model: { id: "claude-haiku-5-5", name: "Haiku 5.5" },
      costUsd: 0.00738418,
      apiMs: 1588,
      wallMs: 26007,
      linesAdded: 3,
      linesRemoved: 1,
      inputTokens: 67785,
      outputTokens: 4,
      contextPercent: 7,
      cache: { warm: true, hitRatio: 0.479, expiresAt: 1793061229000, ttl: "1h" },
      at: 1000,
    });
    expect(limits).toEqual({
      fiveHour: { usedPercent: 29, resetsAt: 1793069400000 },
      sevenDay: { usedPercent: 53, resetsAt: 1793311200000 },
      models: [],
      at: 1000,
    });
  });

  it("reads a model's own weekly limit if Claude Code sends one", () => {
    const { limits } = readStatus({ ...STATUS, rate_limits: { ...STATUS.rate_limits, seven_day_fable: { used_percentage: 12, resets_at: 1 } } }, "isis", 0);
    expect(limits?.models).toEqual([{ key: "seven_day_fable", label: "Fable", limit: { usedPercent: 12, resetsAt: 1000 } }]);
  });

  it("has no limits before the first answer, and nothing without a session id", () => {
    expect(readStatus({ ...STATUS, rate_limits: undefined }, "isis", 0).limits).toBeNull();
    expect(readStatus({ cost: {} }, "isis", 0)).toEqual({ session: null, limits: null });
    expect(readStatus("x", "isis", 0)).toEqual({ session: null, limits: null });
  });
});

describe("totals", () => {
  const session = (id: string, model: string, name: string, cost: number, input: number, output: number): SessionUsage => ({
    sessionId: id,
    nodeId: id,
    model: { id: model, name },
    costUsd: cost,
    apiMs: 1000,
    wallMs: 60_000,
    linesAdded: 10,
    linesRemoved: 2,
    inputTokens: input,
    outputTokens: output,
    contextPercent: 5,
    cache: null,
    at: 0,
  });

  it("adds the sessions up, by model too, with their CO₂ estimate", () => {
    const sum = totals([session("a", "claude-opus-5-5", "Opus 5.5", 1, 1_000_000, 10_000), session("b", "claude-opus-5-5", "Opus 5.5", 0.5, 0, 0), session("c", "claude-haiku-5-5", "Haiku 5.5", 0.25, 2_000_000, 0)]);
    expect(sum).toMatchObject({ costUsd: 1.75, apiMs: 3000, wallMs: 180_000, linesAdded: 30, linesRemoved: 6, sessions: 3 });
    expect(sum.byModel).toEqual([
      { name: "Opus 5.5", costUsd: 1.5, inputTokens: 1_000_000, outputTokens: 10_000, sessions: 2, co2Grams: 78 + 16.52 },
      { name: "Haiku 5.5", costUsd: 0.25, inputTokens: 2_000_000, outputTokens: 0, sessions: 1, co2Grams: 20 },
    ]);
    expect(sum.co2Grams).toBeCloseTo(114.52);
  });
});

describe("co2Grams", () => {
  it("uses claude-carbon's factors per model family, Sonnet's by default", () => {
    expect(co2Grams("claude-fable-5-1", 1_000_000, 1_000_000)).toBe(156 + 3304);
    expect(co2Grams("claude-sonnet-5-5", 1_000_000, 0)).toBe(39);
    expect(co2Grams("mystery", 0, 1_000_000)).toBe(826);
  });
});

describe("formatting", () => {
  it("shows small costs with their cents' detail", () => {
    expect(formatUsd(0.00738)).toBe("0,0074 $");
    expect(formatUsd(12.5)).toBe("12,50 $");
  });

  it("colours a limit by how much of it is used", () => {
    expect(limitTone(50)).toBe("ok");
    expect(limitTone(75)).toBe("late");
    expect(limitTone(95)).toBe("over");
  });
});
