import type { Tool } from "./types";

/** Paint strokes are batched in useToolInput via StrokeSession. */
export const paintTool: Tool = {
  id: "paint",
  cursor: "crosshair",
};
