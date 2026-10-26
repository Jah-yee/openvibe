import { toast } from "sonner";
import { createStore, useStore } from "zustand";
import { ptySendText, ptyWrite } from "@/ipc/pty";
import { terminalText } from "@/nodes/terminal/registry";
import { nodesStore, sessionOf, updateSession } from "@/store/nodes";
import { isRunning, terminalStatusStore } from "@/store/terminalStatus";
import { AGENTS } from "./catalog";

/**
 * Claude Code's Remote Control (spec maj §2): a session followed from
 * claude.ai or the phone. OpenVibe types `/remote-control` and reads the
 * answer on the terminal's screen; a terminal that has it on starts with it.
 */
const COMMAND = "/remote-control";
const ESCAPE = "\x1b";
const UP = "\x1b[A";
const STEP_MS = 250;
const ANSWER_MS = 20_000;
/** A session started with `--remote-control` shows its link within this time. */
const LAUNCH_MS = 60_000;

/** What the last `/remote-control` of a screen says. */
export type RemoteScreen =
  | { kind: "menu"; url?: string; choice: string | null }
  | { kind: "active"; url?: string }
  | { kind: "disconnected" }
  | { kind: "error"; message: string }
  | { kind: "none" };

const LINK = /https:\/\/claude\.ai\/code\/session_[A-Za-z0-9_-]+/g;
const lastLink = (text: string) => text.match(LINK)?.pop();

/** Reads a Claude screen: its Remote Control menu, else the answer to its last `/remote-control`. */
export function remoteScreen(text: string): RemoteScreen {
  const lines = text.split("\n");
  const disconnect = lines.findIndex((line) => line.includes("Disconnect this session"));
  if (disconnect >= 0 && lines.some((line) => line.includes("Esc to continue"))) {
    const choice = lines
      .slice(disconnect, disconnect + 4)
      .map((line) => /❯\s*(.+?)\s*$/.exec(line)?.[1])
      .find((label) => label !== undefined);
    return { kind: "menu", url: lastLink(text), choice: choice ?? null };
  }
  let echo = -1;
  lines.forEach((line, i) => {
    if (/^\s*❯\s*\/(remote-control|rc)\b/.test(line)) echo = i;
  });
  const tail = lines.slice(echo + 1);
  const said = tail.join("\n");
  if (/Remote Control disconnected/i.test(said)) return { kind: "disconnected" };
  const error = tail.find((line) => /requires a claude\.ai subscription|Remote Control.*\b(not available|unavailable|disabled|failed|error)\b/i.test(line));
  if (error) return { kind: "error", message: error.replace(/^[\s⎿]+/, "").trim() };
  if (/remote-control is active|Remote Control (is )?(active|connected)/i.test(said)) return { kind: "active", url: lastLink(said) };
  return { kind: "none" };
}

/** What the flows need of a terminal; injected so they can be tested. */
export interface RemoteIo {
  screen: () => string;
  /** Typed as a paste, then Enter. */
  send: (text: string) => Promise<void>;
  /** Raw keys. */
  press: (keys: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
}

export type RemoteResult = { on: true; url?: string } | { on: false } | { error: string };

async function waitFor(io: RemoteIo, done: (screen: RemoteScreen) => boolean, timeoutMs: number): Promise<RemoteScreen | null> {
  for (let waited = 0; waited < timeoutMs; waited += STEP_MS) {
    await io.sleep(STEP_MS);
    const screen = remoteScreen(io.screen());
    if (done(screen)) return screen;
  }
  return null;
}

/** Turns Remote Control on: `/remote-control`, unless the screen says it already is. */
export async function enableRemote(io: RemoteIo, timeoutMs = ANSWER_MS): Promise<RemoteResult> {
  const before = remoteScreen(io.screen());
  if (before.kind === "active") return { on: true, url: before.url };
  if (before.kind === "menu") {
    await io.press(ESCAPE);
    return { on: true, url: before.url };
  }
  await io.send(COMMAND);
  const after = await waitFor(io, (s) => s.kind === "menu" || s.kind === "active" || s.kind === "error", timeoutMs);
  if (!after) return { error: "Claude n'a pas confirmé Remote Control." };
  if (after.kind === "error") return { error: after.message };
  // Its menu: it was on already.
  if (after.kind === "menu") await io.press(ESCAPE);
  return { on: true, url: after.kind === "menu" || after.kind === "active" ? after.url : undefined };
}

/** Turns Remote Control off: its menu, then « Disconnect this session ». */
export async function disableRemote(io: RemoteIo, timeoutMs = ANSWER_MS): Promise<RemoteResult> {
  let screen = remoteScreen(io.screen());
  if (screen.kind === "disconnected") return { on: false };
  if (screen.kind !== "menu") {
    const wasOn = screen.kind === "active";
    await io.send(COMMAND);
    let after = await waitFor(io, (s) => s.kind === "menu" || (!wasOn && s.kind === "active") || s.kind === "error", timeoutMs);
    // It was off: that command turned it on, the next one opens its menu.
    if (after?.kind === "active") {
      await io.send(COMMAND);
      after = await waitFor(io, (s) => s.kind === "menu" || s.kind === "error", timeoutMs);
    }
    if (!after) return { error: "Claude n'a pas ouvert le menu Remote Control." };
    if (after.kind === "error") return { error: after.message };
    screen = after;
  }
  for (let tries = 0; tries < 3 && screen.kind === "menu" && !screen.choice?.startsWith("Disconnect"); tries++) {
    await io.press(UP);
    await io.sleep(STEP_MS);
    screen = remoteScreen(io.screen());
  }
  if (screen.kind !== "menu" || !screen.choice?.startsWith("Disconnect")) {
    await io.press(ESCAPE);
    return { error: "Le menu Remote Control n'a pas pu être lu." };
  }
  await io.press("\r");
  const done = await waitFor(io, (s) => s.kind === "disconnected", timeoutMs);
  return done ? { on: false } : { error: "Claude n'a pas confirmé la déconnexion." };
}

/** What OpenVibe knows of a running session's Remote Control. */
export interface RemoteLink {
  state: "connecting" | "on" | "error";
  url?: string;
  error?: string;
}

interface RemoteState {
  links: Record<string, RemoteLink>;
  set: (nodeId: string, link: RemoteLink | null) => void;
}

export const remoteStore = createStore<RemoteState>()((set) => ({
  links: {},
  set: (nodeId, link) =>
    set((s) => {
      const links = { ...s.links };
      if (link) links[nodeId] = link;
      else delete links[nodeId];
      return { links };
    }),
}));

export function useRemoteLink(nodeId: string): RemoteLink | undefined {
  return useStore(remoteStore, (s) => s.links[nodeId]);
}

function ioOf(nodeId: string): RemoteIo {
  return {
    screen: () => terminalText(nodeId, 80),
    send: (text) => ptySendText(nodeId, text),
    press: (keys) => ptyWrite(nodeId, keys),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

function nameOf(nodeId: string): string {
  const session = sessionOf(nodesStore.getState().nodes[nodeId]);
  return session?.name || (session ? AGENTS[session.agent].label : "Agent");
}

/** Only Claude sessions have Remote Control. */
export function hasRemote(nodeId: string): boolean {
  return sessionOf(nodesStore.getState().nodes[nodeId])?.agent === "claude";
}

/**
 * Remote Control on or off for one session: remembered for its next starts,
 * typed into it when it runs. Null for a node without a Claude session.
 */
export async function setRemoteControl(nodeId: string, on: boolean): Promise<RemoteResult | null> {
  if (!hasRemote(nodeId)) return null;
  updateSession(nodeId, { remoteControl: on || undefined });
  if (!isRunning(nodeId)) {
    remoteStore.getState().set(nodeId, null);
    return on ? { on: true } : { on: false };
  }
  const previous = remoteStore.getState().links[nodeId];
  remoteStore.getState().set(nodeId, { state: "connecting", url: previous?.url });
  const result = on ? await enableRemote(ioOf(nodeId)) : await disableRemote(ioOf(nodeId));
  if ("error" in result) remoteStore.getState().set(nodeId, { state: "error", error: result.error });
  else remoteStore.getState().set(nodeId, result.on ? { state: "on", url: result.url } : null);
  return result;
}

/** Several sessions at once; one toast says how it went. */
export async function setRemoteControlAll(nodeIds: readonly string[], on: boolean): Promise<void> {
  const ids = nodeIds.filter(hasRemote);
  if (ids.length === 0) {
    toast("Aucune session Claude ici");
    return;
  }
  const results = await Promise.all(ids.map((id) => setRemoteControl(id, on)));
  const failed = ids.filter((_, i) => results[i] && "error" in results[i]);
  const done = ids.length - failed.length;
  const verb = on ? "activé" : "coupé";
  if (done > 0) toast(`Remote Control ${verb} : ${ids.filter((id) => !failed.includes(id)).map(nameOf).join(", ")}`);
  for (const id of failed) {
    const result = results[ids.indexOf(id)];
    if (result && "error" in result) toast.error(`Remote Control de ${nameOf(id)} : ${result.error}`);
  }
}

/** A session started with Remote Control shows its link: OpenVibe reads it. */
async function watchStart(nodeId: string) {
  remoteStore.getState().set(nodeId, { state: "connecting" });
  const io = ioOf(nodeId);
  const seen = await waitFor(io, (s) => s.kind === "active" || s.kind === "error" || !isRunning(nodeId), LAUNCH_MS);
  if (!isRunning(nodeId) || remoteStore.getState().links[nodeId]?.state !== "connecting") return;
  if (seen?.kind === "active") remoteStore.getState().set(nodeId, { state: "on", url: seen.url });
  else if (seen?.kind === "error") remoteStore.getState().set(nodeId, { state: "error", error: seen.message });
  else remoteStore.getState().set(nodeId, { state: "on" });
}

// A session that stops loses its link; one that starts with Remote Control gets it.
terminalStatusStore.subscribe((state, previous) => {
  for (const [nodeId, status] of Object.entries(state.statuses)) {
    const before = previous.statuses[nodeId]?.state;
    if (status.state === before) continue;
    if (status.state !== "running") {
      if (remoteStore.getState().links[nodeId]) remoteStore.getState().set(nodeId, null);
    } else if (sessionOf(nodesStore.getState().nodes[nodeId])?.remoteControl) {
      void watchStart(nodeId);
    }
  }
});
