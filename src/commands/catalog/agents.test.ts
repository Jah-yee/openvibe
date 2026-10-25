// @vitest-environment happy-dom
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { agentsPanelStore } from "@/fleet/agentsPanelState";
import { agentsStore } from "@/fleet/agentsStore";
import { pauseAll, resumeAll } from "@/fleet/broadcast";
import { launchAt, launchFour, newConsole, placeOrchestrator } from "@/fleet/quickActions";
import { labelOf, type Command, type CommandContext } from "../command";
import { pendingUiRequest } from "../uiRequests";
import { AGENT_COMMANDS } from "./agents";

vi.mock("@excalidraw/excalidraw", () => ({}));
vi.mock("@/fleet/quickActions", () => ({ launchAt: vi.fn(), newConsole: vi.fn(), launchFour: vi.fn(), placeOrchestrator: vi.fn() }));
vi.mock("@/fleet/broadcast", () => ({ pauseAll: vi.fn(() => Promise.resolve()), resumeAll: vi.fn(() => Promise.resolve()), workspaceTerminalIds: () => ["isis"] }));

const busy: CommandContext = { project: true, workspaceId: "w1", terminalCount: 1, terminalId: "isis" };
const find = (id: string) => AGENT_COMMANDS.find((c) => c.id === id)!;

beforeEach(() => {
  mockIPC(() => undefined);
  agentsStore.setState({
    agents: [
      { id: "claude", available: true },
      { id: "codex", available: false },
      { id: "shell", available: true },
    ],
  } as never);
});
afterAll(() => clearMocks());

describe("Agents (spec fenêtre §7.3)", () => {
  it("lists the spec's functions, in its order", () => {
    expect(AGENT_COMMANDS.map((c) => labelOf(c, busy))).toEqual([
      "Lancer Claude",
      "Lancer Codex",
      "Lancer Gemini",
      "Lancer Qwen Code",
      "Lancer Cursor",
      "Lancer OpenCode",
      "Lancer Aider",
      "Lancer Ollama…",
      "Lancer Shell",
      "Lancer un agent personnalisé…",
      "Nouvelle console",
      "Lancer 4 agents",
      "Orchestrateur",
      "Composer un groupe…",
      "Tout mettre en pause",
      "Tout reprendre",
    ]);
  });

  it("launches an agent at the center of the view, greys one not found like the Agent menu", async () => {
    expect(find("agent.launch.claude").disabled!(busy)).toBeNull();
    expect(find("agent.launch.codex").disabled!(busy)).toBe("codex introuvable dans le PATH");
    await find("agent.launch.claude").run(busy);
    expect(launchAt).toHaveBeenCalledWith("claude");
  });

  it("opens the Agent menu on Ollama's models and on the custom command", async () => {
    await find("agent.launch.ollama").run(busy);
    expect(pendingUiRequest()).toEqual({ kind: "agentMenu", view: "ollama" });
    await find("agent.custom").run(busy);
    expect(pendingUiRequest()).toEqual({ kind: "agentMenu", view: "options" });
  });

  it("does what the panel and the ＋ menu do", async () => {
    await find("agent.console").run(busy);
    await find("agent.four").run(busy);
    await find("agent.orchestrator").run(busy);
    await find("agents.pauseAll").run(busy);
    await find("agents.resumeAll").run(busy);
    expect([newConsole, launchFour, placeOrchestrator].every((f) => vi.mocked(f).mock.calls.length === 1)).toBe(true);
    expect(pauseAll).toHaveBeenCalledWith(["isis"]);
    expect(resumeAll).toHaveBeenCalledWith(["isis"]);
  });

  it("composes a group from the agents panel, opened if needed", async () => {
    agentsPanelStore.setState({ open: false });
    await find("group.compose").run(busy);
    expect(agentsPanelStore.getState().open).toBe(true);
    expect(pendingUiRequest()).toEqual({ kind: "composeGroup" });
  });

  it("is offered in a project only", () => {
    const home: CommandContext = { project: false, workspaceId: null, terminalCount: 0, terminalId: null };
    expect(AGENT_COMMANDS.filter((c: Command) => c.available(home))).toEqual([]);
  });
});
