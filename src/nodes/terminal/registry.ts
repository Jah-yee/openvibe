import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { openUrl } from "@tauri-apps/plugin-opener";
import "@xterm/xterm/css/xterm.css";
import { ptyKill, ptyResize, ptyWrite } from "@/ipc/pty";
import type { TerminalPayload } from "@/nodes/types";
import { isRunning, terminalStatusStore } from "@/store/terminalStatus";
import { keyAction, NEWLINE_SEQUENCE } from "./keys";
import type { LaunchMode } from "./launch";
import { acceptsInput, attachSession, relaunchSession, restoreSession, startSession, type SessionState } from "./session";

// Terminals live outside React (spec §6.4): Excalidraw unmounts embeddables on a
// workspace switch, and the xterm instance must survive it. Remounting moves the
// existing DOM element into the new host instead of creating a new terminal.
interface Entry {
  term: Terminal;
  fit: FitAddon;
  opened: boolean;
  session: SessionState;
}

const entries = new Map<string, Entry>();
const autostart = new Set<string>();
let livePtys = new Set<string>();

/** Sessions still running in Rust after a webview reload; they are re-attached. */
export function setLivePtys(nodeIds: string[]) {
  livePtys = new Set(nodeIds);
}

/** A terminal just created from the launch dialog starts on its first mount. */
export function markForAutostart(nodeId: string) {
  autostart.add(nodeId);
}

function create(nodeId: string): Entry {
  const term = new Terminal({
    allowProposedApi: true, // needed by the unicode11 addon
    cursorBlink: true,
    fontFamily: "'Cascadia Code', Consolas, monospace",
    fontSize: 13,
    theme: { background: "#1e1e1e" },
    windowsPty: { backend: "conpty" },
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new Unicode11Addon());
  term.unicode.activeVersion = "11";
  term.loadAddon(new WebLinksAddon((_event, uri) => void openUrl(uri)));
  const entry: Entry = { term, fit, opened: false, session: { replaying: false } };

  term.attachCustomKeyEventHandler((event) => {
    const action = keyAction(event, term.hasSelection());
    if (action === "default") return true;
    if (event.type === "keydown") {
      if (action === "copy") {
        void navigator.clipboard.writeText(term.getSelection());
        term.clearSelection();
      } else if (action === "newline") {
        term.input(NEWLINE_SEQUENCE);
      }
      // "paste": returning false lets the browser fire its paste event, which
      // xterm turns into a (bracketed) paste.
    }
    return false;
  });
  term.onData((data) => {
    if (acceptsInput(nodeId, entry.session)) void ptyWrite(nodeId, data).catch(() => undefined);
  });
  term.onResize(({ cols, rows }) => {
    if (isRunning(nodeId)) void ptyResize(nodeId, cols, rows).catch(() => undefined);
  });
  entries.set(nodeId, entry);
  return entry;
}

function loadWebgl(term: Terminal) {
  try {
    const webgl = new WebglAddon();
    // Browsers keep about 16 WebGL contexts; past that, fall back to the DOM renderer.
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch {
    // No WebGL: xterm keeps its DOM renderer.
  }
}

/** Skips hidden or not-yet-laid-out hosts: fit() would shrink the PTY to 2x1. */
export function fitTerminal(nodeId: string, host: HTMLElement) {
  if (host.clientWidth === 0 || host.clientHeight === 0) return;
  entries.get(nodeId)?.fit.fit();
}

/**
 * Shows the terminal of `nodeId` in `host`. The first time a node is shown in this
 * session, its process is started (new node), re-attached (still running after a
 * webview reload) or restored as stopped with its saved output (spec §6.5).
 */
export function mountTerminal(nodeId: string, host: HTMLElement, payload: TerminalPayload) {
  const existing = entries.get(nodeId);
  const entry = existing ?? create(nodeId);
  if (!entry.opened) {
    entry.term.open(host);
    entry.opened = true;
    loadWebgl(entry.term);
  } else if (entry.term.element && entry.term.element.parentElement !== host) {
    host.appendChild(entry.term.element);
  }
  fitTerminal(nodeId, host);
  if (existing) return;
  if (autostart.delete(nodeId)) void startSession(nodeId, entry.term, payload, "new");
  else if (livePtys.delete(nodeId)) void attachSession(nodeId, entry.term, entry.session);
  else void restoreSession(nodeId, entry.term);
}

export function relaunchTerminal(nodeId: string, payload: TerminalPayload, mode: LaunchMode) {
  const entry = entries.get(nodeId);
  if (entry) void relaunchSession(nodeId, entry.term, payload, mode);
}

export function stopTerminal(nodeId: string) {
  void ptyKill(nodeId).catch(() => undefined);
}

export function focusTerminal(nodeId: string) {
  entries.get(nodeId)?.term.focus();
}

/** Stops the process and frees the terminal of a node removed from the canvas. */
export function disposeTerminal(nodeId: string) {
  stopTerminal(nodeId);
  entries.get(nodeId)?.term.dispose();
  entries.delete(nodeId);
  autostart.delete(nodeId);
  terminalStatusStore.getState().remove(nodeId);
}
