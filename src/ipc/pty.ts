import { Channel } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { call } from "./invoke";

export type ShellKind = "default" | "powershell" | "pwsh" | "cmd" | "gitbash";
export type Preset = "claude" | "aider" | "codex" | "shell" | "custom";
export type ClaudeMode = "new" | "resume" | "continue";

export interface ClaudeLaunch {
  mode: ClaudeMode;
  sessionId: string;
  title: string;
}

/** Mirrors Rust's `SpawnSpec` (spec §9). */
export interface SpawnSpec {
  cwd: string;
  shell: ShellKind;
  preset: Preset;
  command: string;
  claude?: ClaudeLaunch;
}

export interface PresetInfo {
  id: Preset;
  available: boolean;
}

export interface PtyExitEvent {
  nodeId: string;
  exitCode: number | null;
}

/** Raw channel payloads arrive as ArrayBuffer; Tauri < 2.5.1 sent small ones as number[]. */
export function toBytes(message: ArrayBuffer | number[]): Uint8Array {
  return message instanceof ArrayBuffer ? new Uint8Array(message) : Uint8Array.from(message);
}

// Output stays as bytes end to end: decoding chunk by chunk would corrupt UTF-8
// sequences split across reads, while xterm's write(Uint8Array) decodes statefully.
function byteChannel(onData: (bytes: Uint8Array) => void): Channel<ArrayBuffer | number[]> {
  const channel = new Channel<ArrayBuffer | number[]>();
  channel.onmessage = (message) => onData(toBytes(message));
  return channel;
}

export function ptySpawn(
  nodeId: string,
  spec: SpawnSpec,
  cols: number,
  rows: number,
  onData: (bytes: Uint8Array) => void,
): Promise<number | null> {
  return call("pty_spawn", { nodeId, spec, cols, rows, onData: byteChannel(onData) });
}

/** Reconnects to a live session; the current scrollback is sent first. */
export function ptyAttach(nodeId: string, onData: (bytes: Uint8Array) => void): Promise<boolean> {
  return call("pty_attach", { nodeId, onData: byteChannel(onData) });
}

export const ptyWrite = (nodeId: string, data: string) => call<void>("pty_write", { nodeId, data });
export const ptyResize = (nodeId: string, cols: number, rows: number) => call<void>("pty_resize", { nodeId, cols, rows });
export const ptyKill = (nodeId: string) => call<void>("pty_kill", { nodeId });
export const ptyList = () => call<string[]>("pty_list");
export const listPresets = () => call<PresetInfo[]>("list_presets");
export const listShells = () => call<ShellKind[]>("list_shells");

export async function getScrollback(nodeId: string): Promise<Uint8Array> {
  return toBytes(await call<ArrayBuffer | number[]>("get_scrollback", { nodeId }));
}

export function onPtyExit(handler: (event: PtyExitEvent) => void): Promise<UnlistenFn> {
  return listen<PtyExitEvent>("pty-exit", (event) => handler(event.payload));
}
