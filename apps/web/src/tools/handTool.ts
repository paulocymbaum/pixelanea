import type { Tool } from "./types";

/** Pan the viewport; pointer routing lives in Canvas.tsx. */
export const handTool: Tool = {
  id: "hand",
  cursor: "grab",
};
