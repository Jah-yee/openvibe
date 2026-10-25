/** Lower case, accents dropped: « Hermès » and « hermes » are the same (spec fenêtre §7.1). */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const words = (text: string) => normalize(text).split(/[\s\-_/.·]+/).filter(Boolean);

function isSubsequence(needle: string, haystack: string): boolean {
  let at = 0;
  for (const char of haystack) if (char === needle[at]) at += 1;
  return at === needle.length;
}

/**
 * How well `query` matches an item (spec fenêtre §7.1), null when a term of
 * the query does not: a term at the start of a word of the label scores
 * best, then of a keyword, then inside a word, then with its letters spread.
 */
export function matchScore(query: string, label: string, keywords: readonly string[] = []): number | null {
  const terms = words(query);
  const labelWords = words(label);
  const allWords = [...labelWords, ...keywords.flatMap(words)];
  const haystack = allWords.join(" ");
  let score = 0;
  for (const term of terms) {
    if (labelWords.some((w) => w.startsWith(term))) score += 4;
    else if (allWords.some((w) => w.startsWith(term))) score += 3;
    else if (haystack.includes(term)) score += 2;
    else if (isSubsequence(term, haystack)) score += 1;
    else return null;
  }
  return score;
}

/** The items matching `query`, best first, ties in their order; every item, in order, without a query. */
export function rank<T>(items: readonly T[], query: string, textOf: (item: T) => { label: string; keywords: readonly string[] }): T[] {
  if (words(query).length === 0) return [...items];
  return items
    .map((item, index) => {
      const { label, keywords } = textOf(item);
      return { item, index, score: matchScore(query, label, keywords) };
    })
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
