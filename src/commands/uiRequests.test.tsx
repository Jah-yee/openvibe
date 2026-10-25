// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { pendingUiRequest, requestUi, useUiRequest } from "./uiRequests";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Tab({ id, seen }: { id: string; seen: string[] }) {
  useUiRequest("renameWorkspace", (request) => {
    if (request.id !== id) return false;
    seen.push(id);
    return true;
  });
  return null;
}

it("lets the right component answer a request, once, even one made before it mounted", async () => {
  const seen: string[] = [];
  requestUi({ kind: "renameWorkspace", id: "w2" });
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <>
        <Tab id="w1" seen={seen} />
        <Tab id="w2" seen={seen} />
      </>,
    ),
  );
  expect(seen).toEqual(["w2"]);
  expect(pendingUiRequest()).toBeNull();
  await act(async () => requestUi({ kind: "renameWorkspace", id: "w1" }));
  expect(seen).toEqual(["w2", "w1"]);
  // A request nobody answers stays pending, never mistaken for another kind.
  await act(async () => requestUi({ kind: "composeGroup" }));
  expect(pendingUiRequest()).toEqual({ kind: "composeGroup" });
  await act(async () => root.unmount());
});
