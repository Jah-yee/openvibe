// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function Bomb({ explode }: { explode: { current: boolean } }) {
  if (explode.current) throw new Error("render failed");
  return <p>fine</p>;
}

it("shows the fallback instead of blanking, logs the error, and retries", async () => {
  const explode = { current: true };
  const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
  await act(async () =>
    root.render(
      <ErrorBoundary scope="node" fallback={(error, retry) => <button onClick={retry}>{error.message}</button>}>
        <Bomb explode={explode} />
      </ErrorBoundary>,
    ),
  );
  expect(host.textContent).toBe("render failed");
  expect(logged.mock.calls.some((args) => String(args[0]).includes("[ui] node"))).toBe(true);
  explode.current = false;
  await act(async () => host.querySelector("button")!.click());
  expect(host.textContent).toBe("fine");
});

it("keeps a sibling alive when one child fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await act(async () =>
    root.render(
      <>
        <ErrorBoundary scope="a" fallback={() => <i>a down</i>}>
          <Bomb explode={{ current: true }} />
        </ErrorBoundary>
        <p>b alive</p>
      </>,
    ),
  );
  expect(host.textContent).toBe("a downb alive");
});
