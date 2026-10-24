// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { onFlushAll } from "@/lib/flush";
import { saveBeforeClose } from "./close";

it("commits the field being edited before writing pending saves", async () => {
  // A title input saves on blur; WebView2 does not blur it when the window closes.
  const input = document.createElement("input");
  document.body.appendChild(input);
  input.focus();
  let saved = false;
  input.addEventListener("blur", () => {
    onFlushAll(() => {
      saved = true;
    });
  });
  await saveBeforeClose();
  expect(document.activeElement).not.toBe(input);
  expect(saved).toBe(true);
  input.remove();
});
