// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { requestUi } from "@/commands/uiRequests";
import { TerminalHeader } from "./TerminalHeader";

vi.mock("./registry", () => ({ relaunchTerminal: vi.fn(), stopTerminal: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("opens its name editor on request, with the keyboard (« Renommer » of the palette)", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const payload = { title: "Isis", name: "Isis", agent: "claude", cwd: "C:/code", shell: "default", command: "" } as const;
  await act(async () => root.render(<TerminalHeader nodeId="isis" payload={payload} status={{ state: "stopped" }} />));
  expect(host.querySelector("input")).toBeNull();
  await act(async () => requestUi({ kind: "renameTerminal", id: "thot" }));
  expect(host.querySelector("input")).toBeNull();
  await act(async () => requestUi({ kind: "renameTerminal", id: "isis" }));
  const field = host.querySelector("input")!;
  expect(field.value).toBe("Isis");
  expect(document.activeElement).toBe(field);
  await act(async () => root.unmount());
  host.remove();
});
