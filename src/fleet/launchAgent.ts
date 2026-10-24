import type { AgentId, OllamaLaunch, ShellKind } from "@/ipc/pty";
import { newTerminalPayload } from "@/nodes/terminal/launch";
import { projectsStore } from "@/store/projects";
import { workspacesStore } from "@/store/workspaces";
import { agentsStore } from "./agentsStore";
import { nameForNewAgent } from "./naming";
import { addTerminal, type Point } from "./terminals";

/** What the "Options" of the agent menu set for the next launches. */
export interface LaunchOptions {
  cwd: string;
  shell: ShellKind;
  title: string;
  command: string;
  ollama?: OllamaLaunch;
}

/** Agents start in the project folder, in the first available shell (spec habillage §6.1). */
export function defaultLaunchOptions(): LaunchOptions {
  const { projects, activeId } = projectsStore.getState();
  const cwd = projects.find((p) => p.id === activeId)?.path ?? "";
  return { cwd, shell: agentsStore.getState().shells[0] ?? "default", title: "", command: "" };
}

/** Creates and starts an agent of the active workspace at `center` (scene coordinates). */
export async function launchAgent(agent: AgentId, options: LaunchOptions, center: Point) {
  const workspaceId = workspacesStore.getState().activeId;
  if (!workspaceId) return;
  const name = await nameForNewAgent(workspaceId);
  await addTerminal(workspaceId, newTerminalPayload({ ...options, agent }, name), center);
}
