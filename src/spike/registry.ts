import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { log } from "./diagnostics";

// Throwaway (milestone 2 prototype). Terminals live outside React so an
// embeddable that Excalidraw unmounts (off-screen, workspace switch) keeps its
// xterm instance; remounting moves the existing DOM element into the new host.
export interface SpikeEntry {
  term: Terminal;
  fit: FitAddon;
  opened: boolean;
}

const entries = new Map<string, SpikeEntry>();
const PROMPT = "\x1b[32mspike\x1b[0m$ ";

export function spikeEntries(): ReadonlyMap<string, SpikeEntry> {
  return entries;
}

export function getSpikeTerminal(nodeId: string): SpikeEntry {
  const existing = entries.get(nodeId);
  if (existing) return existing;
  const term = new Terminal({ fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 13, cursorBlink: true });
  const fit = new FitAddon();
  term.loadAddon(fit);
  const entry: SpikeEntry = { term, fit, opened: false };
  entries.set(nodeId, entry);
  attachLocalEcho(nodeId, term);
  return entry;
}

/** Puts the terminal into `host`: `open` the first time, re-parent afterwards. */
export function mountInto(entry: SpikeEntry, host: HTMLElement, nodeId: string) {
  if (!entry.opened) {
    entry.term.open(host);
    entry.opened = true;
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        log(`[${short(nodeId)}] contexte WebGL perdu → rendu DOM`);
        webgl.dispose();
      });
      entry.term.loadAddon(webgl);
    } catch (error) {
      log(`[${short(nodeId)}] WebGL indisponible : ${String(error)}`);
    }
    entry.term.write(`Prototype ${short(nodeId)} — écho local\r\n${PROMPT}`);
    log(`[${short(nodeId)}] créé`);
  } else if (entry.term.element && entry.term.element.parentElement !== host) {
    host.appendChild(entry.term.element);
    log(`[${short(nodeId)}] remonté avec son état (${entry.term.buffer.active.length} lignes)`);
  }
  entry.fit.fit();
}

export const short = (nodeId: string) => nodeId.slice(0, 4);

function attachLocalEcho(nodeId: string, term: Terminal) {
  term.onData((data) => {
    if (data === "\x1b") {
      log(`[${short(nodeId)}] Échap reçu par le terminal ✔`);
      return;
    }
    if (data.startsWith("\x1b")) {
      log(`[${short(nodeId)}] séquence ${JSON.stringify(data)}`);
      return;
    }
    for (const char of data) {
      if (char === "\r") term.write(`\r\n${PROMPT}`);
      else if (char === "\x7f") term.write("\b \b");
      else if (char >= " ") term.write(char);
    }
  });
}
