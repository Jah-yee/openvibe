/** Buttons of the left rail (spec habillage §5.3). */
export type RailTool = "selection" | "shapes" | "text" | "pen" | "eraser" | "image";

/** Excalidraw tools of the SHAPES menu. */
export type ShapeTool = "rectangle" | "ellipse" | "diamond" | "line" | "arrow" | "frame";

/** The rail button that shows Excalidraw's active tool, if any. */
export function railToolOf(tool: string): RailTool | null {
  switch (tool) {
    case "selection":
    case "lasso":
      return "selection";
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

/** Pen colors as they should look on the canvas (spec habillage §4.3). */
export const PEN_COLORS: { label: string; display: string }[] = [
  { label: "Crème", display: "#EDE8DF" },
  { label: "Orange", display: "#F2612E" },
  { label: "Vert", display: "#5E9A55" },
  { label: "Or", display: "#C9A34E" },
  { label: "Rouge", display: "#EF4444" },
  { label: "Cyan", display: "#5CC8F0" },
  { label: "Lavande", display: "#A47CF0" },
  { label: "Ardoise", display: "#4B5675" },
];

export const PEN_WIDTHS = [1, 2, 4, 6, 8];
