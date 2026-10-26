import { exportToSvg, restoreElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { IconItem } from "./library";

const drawn = new Map<string, Promise<SVGSVGElement | null>>();

/** An icon drawn as Excalidraw would, in the canvas's theme; drawn once per theme. */
export function iconThumbnail(item: IconItem, dark: boolean): Promise<SVGSVGElement | null> {
  const key = `${item.id}:${dark ? "dark" : "light"}`;
  const known = drawn.get(key);
  if (known) return known;
  const svg: Promise<SVGSVGElement | null> = exportToSvg({
    elements: restoreElements(item.elements as unknown as ExcalidrawElement[], null),
    appState: { exportBackground: false, exportWithDarkMode: dark },
    files: null,
    exportPadding: 4,
    skipInliningFonts: true,
  }).catch(() => null);
  drawn.set(key, svg);
  return svg;
}
