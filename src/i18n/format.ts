import { langStore, type Lang } from "./index";

const current = (): Lang => langStore.getState().lang;

/** « 67,8 » in French, "67.8" in English. */
export function formatDecimal(value: number, digits: number, lang: Lang = current()): string {
  const text = value.toFixed(digits);
  return lang === "fr" ? text.replace(".", ",") : text;
}

/** French keyboards print Maj, Échap, Suppr, Entrée; English ones Shift, Esc, Del, Enter. */
const ENGLISH_KEYS: Record<string, string> = { Maj: "Shift", Échap: "Esc", Suppr: "Del", Entrée: "Enter" };

/** A shortcut as the interface shows it: « Ctrl+Maj+P » / "Ctrl+Shift+P". */
export function keyLabel(keys: string, lang: Lang = current()): string {
  if (lang === "fr") return keys;
  return keys
    .split("+")
    .map((key) => ENGLISH_KEYS[key] ?? key)
    .join("+");
}

/** « 03:50 » today, « lun. 08:00 » / "Mon 08:00" another day, in 24-hour time. */
export function formatClock(ms: number, now: number, lang: Lang = current()): string {
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const date = new Date(ms);
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === new Date(now).toDateString() ? time : `${date.toLocaleDateString(locale, { weekday: "short" })} ${time}`;
}
