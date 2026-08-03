import type { CellCoord } from "@/canvas/coordinates";
import { PaintCellsCommand, type CellChange } from "@/state/commands/paintCells";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import type { ToolContext } from "./types";

function cellKey(cell: CellCoord): string {
  return `${cell.x},${cell.y}`;
}

/** Accumulates paint/erase changes for one pointer-down→up gesture. */
export class StrokeSession {
  private changes = new Map<string, CellChange>();
  active = false;

  begin(): void {
    this.changes.clear();
    this.active = true;
  }

  cancel(): void {
    this.changes.clear();
    this.active = false;
  }

  paintCell(cell: CellCoord, ctx: ToolContext): void {
    const previous = ctx.getPixelIndex(cell);
    const next = ctx.activeColorIndex;
    if (previous === next) {
      return;
    }
    if (
      ctx.paletteLocked &&
      (next < 0 || next >= ctx.paletteColorCount)
    ) {
      return;
    }
    this.recordChange(cell, previous, next);
  }

  eraseCell(cell: CellCoord, ctx: ToolContext): void {
    const previous = ctx.getPixelIndex(cell);
    if (previous === TRANSPARENT_INDEX) {
      return;
    }
    this.recordChange(cell, previous, TRANSPARENT_INDEX);
  }

  private recordChange(cell: CellCoord, previous: number, next: number): void {
    const key = cellKey(cell);
    const existing = this.changes.get(key);
    if (existing) {
      existing.next = next;
      return;
    }
    this.changes.set(key, { x: cell.x, y: cell.y, previous, next });
  }

  preview(ctx: ToolContext): void {
    const changes = this.getChanges();
    if (changes.length > 0) {
      ctx.previewCells(changes);
    }
  }

  commit(ctx: ToolContext): void {
    const changes = this.getChanges();
    this.cancel();
    if (changes.length === 0) {
      return;
    }
    ctx.dispatch(new PaintCellsCommand(changes));
  }

  getChanges(): CellChange[] {
    return Array.from(this.changes.values());
  }
}
