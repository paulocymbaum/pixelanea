import { bresenhamLine } from "@/canvas/bresenham";
import { isCellInBounds, type CellCoord } from "@/canvas/coordinates";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import type { Tool } from "./types";

let lineStart: CellCoord | null = null;

function isPaintColorValid(ctx: import("./types").ToolContext): boolean {
  if (
    ctx.paletteLocked &&
    (ctx.activeColorIndex < 0 || ctx.activeColorIndex >= ctx.paletteColorCount)
  ) {
    return false;
  }
  return true;
}

function buildLineCommand(
  start: CellCoord,
  end: CellCoord,
  ctx: import("./types").ToolContext,
): PaintCellsCommand | void {
  const paintColor = ctx.activeColorIndex;
  const cells = bresenhamLine(start.x, start.y, end.x, end.y);
  const changes: import("@/state/commands/paintCells").CellChange[] = [];
  const seen = new Set<string>();

  for (const cell of cells) {
    if (!isCellInBounds(cell, ctx.gridWidth, ctx.gridHeight)) {
      continue;
    }
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const previous = ctx.getPixelIndex(cell);
    if (previous === paintColor) {
      continue;
    }

    changes.push({
      x: cell.x,
      y: cell.y,
      previous,
      next: paintColor,
    });
  }

  if (changes.length === 0) {
    return;
  }

  return new PaintCellsCommand(changes);
}

export const lineTool: Tool = {
  id: "line",
  cursor: "crosshair",
  onPointerDown(_event, cell, ctx) {
    if (ctx.readOnly) {
      lineStart = null;
      return;
    }
    lineStart = cell;
  },
  onPointerUp(_event, cell, ctx) {
    if (ctx.readOnly || !lineStart || !isPaintColorValid(ctx)) {
      lineStart = null;
      return;
    }

    const start = lineStart;
    lineStart = null;
    return buildLineCommand(start, cell, ctx);
  },
};
