// Copies Excalidraw's fonts into public/fonts so the canvas never fetches them
// from a CDN (local-first). Runs on every install; public/fonts is git-ignored.
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../node_modules/@excalidraw/excalidraw/dist/prod/fonts", import.meta.url));
const target = fileURLToPath(new URL("../public/fonts", import.meta.url));

if (!existsSync(source)) {
  console.error(`Excalidraw fonts not found at ${source}`);
  process.exit(1);
}
cpSync(source, target, { recursive: true });
console.log(`Excalidraw fonts copied to ${target}`);
