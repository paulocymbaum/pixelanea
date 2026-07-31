import type { Tool } from "./types";

export const eyedropperTool: Tool = {
  id: "eyedropper",
  cursor: "copy",
  onPointerDown(_event, cell, ctx) {
    if (ctx.readOnly) {
      return;
    }
    const index = ctx.getPixelIndex(cell);
    ctx.setActiveColorIndex(index);
  },
};
