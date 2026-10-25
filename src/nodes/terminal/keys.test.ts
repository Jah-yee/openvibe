import { expect, it } from "vitest";
import { keyAction } from "./keys";

const key = (k: string, mods: Partial<Record<"ctrlKey" | "shiftKey" | "altKey" | "metaKey", boolean>> = {}) => ({
  key: k,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods,
});

it("Ctrl+C copies only when text is selected, and interrupts otherwise", () => {
  expect(keyAction(key("c", { ctrlKey: true }), true)).toBe("copy");
  expect(keyAction(key("c", { ctrlKey: true }), false)).toBe("default");
});

it("Ctrl+Shift+C always copies", () => {
  expect(keyAction(key("C", { ctrlKey: true, shiftKey: true }), false)).toBe("copy");
});

it("Ctrl+V and Ctrl+Shift+V paste", () => {
  expect(keyAction(key("v", { ctrlKey: true }), false)).toBe("paste");
  expect(keyAction(key("V", { ctrlKey: true, shiftKey: true }), false)).toBe("paste");
});

it("Shift+Enter inserts a newline, plain Enter and Ctrl+Shift+Enter do not", () => {
  expect(keyAction(key("Enter", { shiftKey: true }), false)).toBe("newline");
  expect(keyAction(key("Enter"), false)).toBe("default");
  expect(keyAction(key("Enter", { ctrlKey: true, shiftKey: true }), false)).toBe("default");
});

it("leaves Alt combinations and Escape to the terminal", () => {
  expect(keyAction(key("c", { ctrlKey: true, altKey: true }), true)).toBe("default");
  expect(keyAction(key("Escape"), true)).toBe("default");
});
