/** Buttons of the tool rail (spec identité §5.4). */
export type RailTool = "selection" | "hand" | "shapes" | "text" | "pen" | "eraser" | "image";

/** Excalidraw tools of the SHAPES menu. */
export type ShapeTool = "rectangle" | "ellipse" | "diamond" | "line" | "arrow" | "frame";

/** The rail button that shows Excalidraw's active tool, if any. */
export function railToolOf(tool: string): RailTool | null {
  switch (tool) {
    case "selection":
    case "lasso":
      return "selection";
    case "hand":
      return "hand";
    case "rectangle":
    case "ellipse":
    case "diamond":
    case "line":
    case "arrow":
    case "frame":
      return "shapes";
    case "text":
      return "text";
    case "freedraw":
      return "pen";
    case "eraser":
      return "eraser";
    case "image":
      return "image";
    default:
      return null;
  }
}

/**
 * Pen colors as stored (spec identité §4.2): what the light theme shows; the
 * dark theme shows the same hues with their lightness inverted.
 */
export const PEN_COLORS: { label: string; scene: string }[] = [
  { label: "Encre", scene: "#29261B" },
  { label: "Terre cuite", scene: "#C2603F" },
  { label: "Olive", scene: "#5E7A43" },
  { label: "Ocre", scene: "#B07D3A" },
  { label: "Rouge", scene: "#C93C37" },
  { label: "Ciel", scene: "#3F74A8" },
  { label: "Lavande", scene: "#7C66B0" },
  { label: "Ardoise", scene: "#625F57" },
];

export const PEN_WIDTHS = [1, 2, 4, 6, 8];
