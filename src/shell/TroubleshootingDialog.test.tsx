// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { openUrl } from "@tauri-apps/plugin-opener";
import { diagnosticText, type Diagnostics } from "@/app/diagnostics";
import { langStore } from "@/i18n";
import { showTroubleshooting, troubleshootStore } from "./troubleshoot";
import { TroubleshootingDialog } from "./TroubleshootingDialog";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn(() => Promise.resolve()) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const found: Diagnostics = {
  version: "1.0.0-beta.1",
  os: "Windows 11 (build 26300)",
  agents: [
    { id: "claude", path: "~\\.local\\bin\\claude.exe" },
    { id: "codex", path: null },
  ],
  git: null,
  gitBash: null,
  server: true,
  dataDir: "~\\AppData\\Roaming\\dev.openvibe.app",
  logDir: "~\\AppData\\Local\\dev.openvibe.app\\logs",
};

let calls: string[];
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  calls = [];
  vi.mocked(openUrl).mockClear();
  troubleshootStore.setState({ open: false, diagnostics: null, error: null });
  mockIPC((cmd) => {
    calls.push(cmd);
    if (cmd === "diagnostics") return found;
    if (cmd === "refresh_path" || cmd === "open_data_dir" || cmd === "open_log_dir") return null;
    if (cmd === "list_agents" || cmd === "list_shells") return [];
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  clearMocks();
  langStore.setState({ lang: "fr" });
});

const open = async () => {
  await act(async () => root.render(<TroubleshootingDialog />));
  await act(async () => showTroubleshooting());
};
const dialog = () => document.querySelector<HTMLElement>("[role='dialog']")!;
const button = (text: string) => [...dialog().querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;

it("shows the version, the agents found and where, Git and the local server (spec première version §7.3)", async () => {
  await open();
  const text = dialog().textContent!;
  expect(text).toContain("Dépannage");
  expect(text).toContain("1.0.0-beta.1");
  expect(text).toContain("~\\.local\\bin\\claude.exe");
  expect(dialog().querySelector("[data-agent='codex']")!.textContent).toContain("introuvable");
  // Without Git Bash, the usage meter stays empty: the dialog says why.
  expect(dialog().querySelector("[data-check='gitBash']")!.textContent).toContain("compteur d'usage");
  expect(dialog().querySelector("[data-check='server']")!.textContent).toContain("en marche");
});

it("copies the diagnostic, opens the folders, the guide and a new issue with the version", async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  await open();
  await act(async () => button("Copier le diagnostic").click());
  expect(writeText).toHaveBeenCalledWith(diagnosticText(found, "fr"));
  await act(async () => button("Ouvrir le dossier des données").click());
  await act(async () => button("Ouvrir le dossier des journaux").click());
  expect(calls).toContain("open_data_dir");
  expect(calls).toContain("open_log_dir");
  await act(async () => button("Guide de dépannage").click());
  await act(async () => button("Signaler un problème").click());
  expect(vi.mocked(openUrl).mock.calls.map(([url]) => url)).toEqual([
    "https://github.com/Mideky-hub/openvibe/blob/main/docs/troubleshooting.fr.md",
    "https://github.com/Mideky-hub/openvibe/issues/new?template=bug_report.yml&version=1.0.0-beta.1",
  ]);
});

it("reads Windows' PATH again before checking again", async () => {
  await open();
  calls = [];
  await act(async () => button("Vérifier à nouveau").click());
  expect(calls.indexOf("refresh_path")).toBeGreaterThanOrEqual(0);
  expect(calls.indexOf("refresh_path")).toBeLessThan(calls.lastIndexOf("diagnostics"));
});

it("speaks English when the interface does", async () => {
  langStore.setState({ lang: "en" });
  await open();
  expect(dialog().textContent).toContain("Troubleshooting");
  expect(dialog().querySelector("[data-agent='codex']")!.textContent).toContain("not found");
  expect(button("Report a problem")).toBeTruthy();
});
