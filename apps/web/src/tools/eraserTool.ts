import type { Tool } from "./types";

/** Eraser strokes are batched in useToolInput via StrokeSession. */
export const eraserTool: Tool = {
  id: "eraser",
  cursor: "cell",
};
