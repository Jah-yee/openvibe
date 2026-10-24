/** Windows path compare key: case-insensitive, either separator, no trailing one. */
function pathKey(path: string): string {
  return normalizePath(path).replace(/\//g, "\\").toLowerCase();
}

/** Trims spaces and trailing separators, keeping a drive root ("D:\") intact. */
function normalizePath(path: string): string {
  const trimmed = path.trim();
  const bare = trimmed.replace(/[\\/]+$/, "");
  return bare === "" || bare.endsWith(":") ? trimmed : bare;
}

/**
 * `path` moved from the folder `from` to `to` ("C:\api\web" from "C:\api" to
 * "D:\api" gives "D:\api\web"); null when `path` is not inside `from`. Mirrors
 * Rust's `projects::rebase_path`, which rewrites the saved terminals.
 */
export function rebasePath(path: string, from: string, to: string): string | null {
  const key = pathKey(path);
  const fromKey = pathKey(from);
  const target = normalizePath(to);
  if (key === fromKey) return target;
  if (!key.startsWith(`${fromKey}\\`)) return null;
  // The rest of the path keeps its own case.
  const rest = [...normalizePath(path).replace(/\//g, "\\")].slice([...fromKey].length + 1).join("");
  return `${target.replace(/[\\/]+$/, "")}\\${rest}`;
}
