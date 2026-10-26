// Downloads the Excalidraw community libraries of the icons menu (spec maj §4)
// into public/libraries, minified, with their credits. Run by hand when the
// catalog changes: `node scripts/fetch-icon-libraries.mjs`. The files are
// committed, so the app never fetches them (local-first).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAW = "https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/main/libraries";
const catalog = JSON.parse(readFileSync(fileURLToPath(new URL("../src/canvas/icons/catalog.json", import.meta.url)), "utf8"));
const target = fileURLToPath(new URL("../public/libraries/", import.meta.url));
mkdirSync(target, { recursive: true });

const credits = [
  "# Icônes",
  "",
  "Bibliothèques de la communauté Excalidraw (https://libraries.excalidraw.com),",
  "publiées sous licence MIT dans https://github.com/excalidraw/excalidraw-libraries",
  "(Copyright (c) 2020 Excalidraw). Les logos AWS, Azure et Google Cloud restent",
  "des marques de leurs propriétaires ; ils servent ici à dessiner des architectures.",
  "",
];
for (const category of catalog.categories) {
  credits.push(`## ${category.label}`, "");
  for (const library of category.libraries) {
    const response = await fetch(`${RAW}/${library.source}.excalidrawlib`);
    if (!response.ok) throw new Error(`${library.source}: ${response.status}`);
    const data = await response.json();
    const file = `${library.source.replace("/", "__")}.excalidrawlib`;
    writeFileSync(`${target}${file}`, JSON.stringify(data));
    credits.push(`- ${library.name} — ${library.authors.join(", ")} (${library.source})`);
    console.log(`${file}: ${(JSON.stringify(data).length / 1024).toFixed(0)} Ko`);
  }
  credits.push("");
}
writeFileSync(`${target}CREDITS.md`, credits.join("\n"));
