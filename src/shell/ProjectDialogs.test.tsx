// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ProjectDialogs } from "./ProjectDialogs";

vi.mock("./CloseAgentDialog", () => ({
  CloseAgentDialog: () => {
    throw new Error("dialog failed");
  },
}));
vi.mock("./CloseGroupDialog", () => ({ CloseGroupDialog: () => <p>group dialog</p> }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("keeps a failing dialog to itself: the project stays on screen (spec première version §3.4)", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <>
        <ProjectDialogs />
        <p>project</p>
      </>,
    ),
  );
  expect(host.textContent).toBe("group dialogproject");
  await act(async () => root.unmount());
});
