// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { defineMessages, langStore, messages, plural, readLanguageChoice, resolveLang, useMessages } from "./index";
import { setLanguage } from "./settings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  clearMocks();
  langStore.setState({ choice: "system", lang: "fr" });
});

const dict = defineMessages(
  { title: "Projets", count: (n: number) => plural("fr", n, "agent", "agents") },
  { title: "Projects", count: (n: number) => plural("en", n, "agent", "agents") },
);

it("follows Windows: French when it is French, English otherwise (spec première version §7.1)", () => {
  expect(resolveLang("system", "fr-FR")).toBe("fr");
  expect(resolveLang("system", "fr")).toBe("fr");
  expect(resolveLang("system", "fr-CA")).toBe("fr");
  expect(resolveLang("system", "en-GB")).toBe("en");
  expect(resolveLang("system", "de-DE")).toBe("en");
  expect(resolveLang("system", "")).toBe("en");
  expect(resolveLang("en", "fr-FR")).toBe("en");
  expect(resolveLang("fr", "en-US")).toBe("fr");
});

it("reads a saved choice, and falls back to the system for anything else", () => {
  expect(readLanguageChoice("en")).toBe("en");
  expect(readLanguageChoice("fr")).toBe("fr");
  expect(readLanguageChoice("system")).toBe("system");
  expect(readLanguageChoice("de")).toBe("system");
  expect(readLanguageChoice(42)).toBe("system");
});

it("gives the current language's messages, with each language's plural", () => {
  expect(messages(dict).title).toBe("Projets");
  expect(messages(dict).count(0)).toBe("0 agent");
  langStore.setState({ lang: "en" });
  expect(messages(dict).title).toBe("Projects");
  expect(messages(dict).count(0)).toBe("0 agents");
  expect(messages(dict).count(1)).toBe("1 agent");
});

it("re-renders a component when the language changes", async () => {
  function Title() {
    return <h1>{useMessages(dict).title}</h1>;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<Title />));
  expect(host.textContent).toBe("Projets");
  await act(async () => langStore.setState({ lang: "en" }));
  expect(host.textContent).toBe("Projects");
  await act(async () => root.unmount());
});

it("saves the choice, applies it, and tells Rust the language it resolves to", async () => {
  const calls: { cmd: string; args: unknown }[] = [];
  mockIPC((cmd, args) => {
    calls.push({ cmd, args });
    return undefined;
  });
  await setLanguage("en");
  expect(langStore.getState()).toMatchObject({ choice: "en", lang: "en" });
  expect(document.documentElement.lang).toBe("en");
  expect(calls).toContainEqual({ cmd: "set_setting", args: { key: "ui.language", value: "en" } });
  expect(calls).toContainEqual({ cmd: "set_language", args: { lang: "en" } });
});
