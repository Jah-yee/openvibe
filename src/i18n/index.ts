import { createStore, useStore } from "zustand";

/**
 * English or French (spec première version §7.1): typed dictionaries per
 * domain, no library. `defineMessages(fr, en)` gives `en` the type of `fr`, so
 * a missing key does not compile; a value is a text or a function (parameters,
 * each language's plural).
 */
export type Lang = "fr" | "en";
export type LanguageChoice = "system" | Lang;
export type Dictionary<M> = Record<Lang, M>;

/** French when Windows is French, English otherwise. */
export function resolveLang(choice: LanguageChoice, systemLanguage: string): Lang {
  if (choice !== "system") return choice;
  return systemLanguage.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function readLanguageChoice(raw: unknown): LanguageChoice {
  return raw === "fr" || raw === "en" || raw === "system" ? raw : "system";
}

/** The webview's language, which follows Windows' display language. */
export function systemLanguage(): string {
  return typeof navigator === "undefined" ? "" : (navigator.language ?? "");
}

export interface LangState {
  choice: LanguageChoice;
  lang: Lang;
}

/** From the first render on: Windows' language until the saved choice is read. */
export const langStore = createStore<LangState>()(() => ({ choice: "system", lang: resolveLang("system", systemLanguage()) }));

export const useLang = () => useStore(langStore, (s) => s.lang);

export function defineMessages<M>(fr: M, en: NoInfer<M>): Dictionary<M> {
  return { fr, en };
}

/** Outside React: the current language's messages, read when called. */
export function messages<M>(dict: Dictionary<M>): M {
  return dict[langStore.getState().lang];
}

/** In a component: re-renders when the language changes. */
export function useMessages<M>(dict: Dictionary<M>): M {
  return dict[useLang()];
}

/** "1 agent", "3 agents": French uses the singular for 0 and 1, English for 1 only. */
export function plural(lang: Lang, count: number, one: string, many: string): string {
  const singular = lang === "fr" ? count <= 1 : count === 1;
  return `${count} ${singular ? one : many}`;
}
