// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { arrive } from "@/canvas/arrive";
import { insertIntoField, pasteIntoOrchestrator } from "./field";

vi.mock("@/canvas/arrive", () => ({ arrive: vi.fn() }));

it("puts text at the cursor as if typed, React's change handler seeing it", () => {
  const field = document.createElement("textarea");
  field.value = "ab";
  field.setSelectionRange(1, 1);
  const input = vi.fn();
  field.addEventListener("input", input);
  insertIntoField(field, "X");
  expect(field.value).toBe("aXb");
  expect(field.selectionStart).toBe(2);
  expect(input).toHaveBeenCalledTimes(1);
});

it("pastes into an orchestrator's field once the arrival gave it the keyboard", async () => {
  document.body.innerHTML = '<div data-orchestrator="chef"><textarea></textarea></div>';
  const field = document.querySelector("textarea")!;
  vi.mocked(arrive).mockImplementation(() => {
    requestAnimationFrame(() => field.focus());
    return true;
  });
  await pasteIntoOrchestrator("chef", "hello");
  expect(arrive).toHaveBeenCalledWith("chef");
  expect(field.value).toBe("hello");
});
