import { defineMessages, langStore, type Lang } from "@/i18n";

const AGO = defineMessages(
  { now: "à l'instant", ago: (count: number, unit: "min" | "h" | "d") => `il y a ${count} ${unit === "d" ? "j" : unit}` },
  { now: "just now", ago: (count: number, unit: "min" | "h" | "d") => `${count} ${unit} ago` },
);

/** "à l'instant", "il y a 5 min", "il y a 2 h", "il y a 3 j" (spec habillage §5.1); "just now", "5 min ago"… */
export function formatAgo(timestampMs: number, nowMs = Date.now(), lang: Lang = langStore.getState().lang): string {
  const t = AGO[lang];
  const seconds = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  if (seconds < 60) return t.now;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t.ago(minutes, "min");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.ago(hours, "h");
  return t.ago(Math.floor(hours / 24), "d");
}

/** "1 agent actif", "3 agents actifs"; French uses the singular for 0 and 1. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

/** "45 s", "12 min", "1 h 05": how long an agent has been in its state (spec habillage §10.4). */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}
