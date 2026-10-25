/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Test helper: a source file of `src/`, as text. Vitest does not load
 * stylesheets, not even with `?raw`, so tests read them from disk.
 */
export function readSource(pathInSrc: string): string {
  return readFileSync(new URL(`../${pathInSrc}`, import.meta.url), "utf8");
}

/** Test helper: every `.ts`, `.tsx` and `.css` file of `src/` but the tests, by path, as text. */
export function sourceFiles(): Record<string, string> {
  const src = fileURLToPath(new URL("../", import.meta.url));
  const files = readdirSync(src, { recursive: true, encoding: "utf8" })
    .map((path) => path.replace(/\\/g, "/"))
    .filter((path) => /\.(ts|tsx|css)$/.test(path) && !/\.test\.tsx?$/.test(path));
  return Object.fromEntries(files.map((path) => [path, readFileSync(`${src}${path}`, "utf8")]));
}

/**
 * Test helper: the custom properties declared by the first CSS rule whose
 * selector list is exactly `selector`, e.g. `:root[data-theme="light"]`.
 */
export function cssBlock(css: string, selector: string): Record<string, string> {
  const head = css.indexOf(`${selector} {`);
  if (head < 0) throw new Error(`no rule "${selector}"`);
  const open = css.indexOf("{", head);
  const body = css.slice(open + 1, css.indexOf("}", open));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
