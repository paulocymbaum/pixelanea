import { ClearCellCommand } from "@/state/commands/clearCell";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import type { Tool } from "./types";

export const eraserTool: Tool = {
  id: "eraser",
  cursor: "cell",
  onPointerDown(_event, cell, ctx) {
    if (ctx.readOnly) {
      return;
    }
    const previous = ctx.getPixelIndex(cell);
    if (previous === TRANSPARENT_INDEX) {
      return;
    }
    return new ClearCellCommand(cell.x, cell.y, previous);
  },
  onPointerMove(event, cell, ctx) {
    if (ctx.readOnly || (event.buttons & 1) === 0) {
      return;
    }
    const previous = ctx.getPixelIndex(cell);
    if (previous === TRANSPARENT_INDEX) {
      return;
    }
    return new ClearCellCommand(cell.x, cell.y, previous);
  },
};
