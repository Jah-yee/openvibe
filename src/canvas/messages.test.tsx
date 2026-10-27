// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it } from "vitest";
import { langStore } from "@/i18n";
import { nextGroupName, type SceneFrame } from "./groups";
import { canvasMessages, EXCALIDRAW_LANG } from "./messages";
import { messages } from "@/i18n";

beforeEach(() => langStore.setState({ lang: "en" }));
afterEach(() => langStore.setState({ lang: "fr" }));

const named = (name: string) => ({ name }) as SceneFrame;

it("names new groups in the interface's language, skipping a name taken in either", () => {
  expect(nextGroupName([])).toBe("Group 1");
  expect(nextGroupName([named("Group 1"), named("Groupe 2")])).toBe("Group 3");
  langStore.setState({ lang: "fr" });
  expect(nextGroupName([named("Group 1")])).toBe("Groupe 2");
});

it("speaks English for the canvas texts and hands Excalidraw the matching language code", () => {
  expect(messages(canvasMessages).saveFailed("disk full")).toBe("Could not save: disk full");
  expect(messages(canvasMessages).loading).toBe("Loading…");
  expect(EXCALIDRAW_LANG.en).toBe("en");
  expect(EXCALIDRAW_LANG.fr).toBe("fr-FR");
});
