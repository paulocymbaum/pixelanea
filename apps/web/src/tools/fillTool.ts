import { floodFill } from "@/canvas/floodFill";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import type { Tool } from "./types";

function isFillColorValid(ctx: import("./types").ToolContext): boolean {
  if (
    ctx.paletteLocked &&
    (ctx.activeColorIndex < 0 || ctx.activeColorIndex >= ctx.paletteColorCount)
  ) {
    return false;
  }
  return true;
}

export const fillTool: Tool = {
  id: "fill",
  cursor: "cell",
  onPointerDown(_event, cell, ctx) {
    if (ctx.readOnly || !isFillColorValid(ctx)) {
      return;
    }

    const targetColor = ctx.getPixelIndex(cell);
    const fillColor = ctx.activeColorIndex;
    if (targetColor === fillColor) {
      return;
    }

    const region = floodFill(
      ctx.getPixelIndex,
      ctx.gridWidth,
      ctx.gridHeight,
      cell,
      targetColor,
    );
    if (region.length === 0) {
      return;
    }

    const changes = region.map((c) => ({
      x: c.x,
      y: c.y,
      previous: targetColor,
      next: fillColor,
    }));

    return new PaintCellsCommand(changes);
  },
};
