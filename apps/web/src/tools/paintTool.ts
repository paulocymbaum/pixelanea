import type { CellCoord } from "@/canvas/coordinates";
import { PaintCellCommand } from "@/state/commands/paintCell";
import type { Tool } from "./types";

function paintAt(
  cell: CellCoord,
  ctx: import("./types").ToolContext,
): PaintCellCommand | void {
  const previous = ctx.getPixelIndex(cell);
  const next = ctx.activeColorIndex;
  if (previous === next) {
    return;
  }
  return new PaintCellCommand(cell.x, cell.y, previous, next);
}

export const paintTool: Tool = {
  id: "paint",
  cursor: "crosshair",
  onPointerDown(_event, cell, ctx) {
    if (ctx.readOnly) {
      return;
    }
    return paintAt(cell, ctx);
  },
  onPointerMove(event, cell, ctx) {
    if (ctx.readOnly || (event.buttons & 1) === 0) {
      return;
    }
    return paintAt(cell, ctx);
  },
};
