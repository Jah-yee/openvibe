/** "à l'instant", "il y a 5 min", "il y a 2 h", "il y a 3 j" (spec habillage §5.1). */
export function formatAgo(timestampMs: number, nowMs = Date.now()): string {
  const seconds = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

/** "1 agent actif", "3 agents actifs"; French uses the singular for 0 and 1. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}
