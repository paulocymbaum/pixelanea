import type { ClipboardData } from "@/state/editorStoreClipboard";
import { cellIndex, TRANSPARENT_INDEX, type Command } from "./types";
import { PaintCellsCommand, type CellChange } from "./paintCells";

export function buildPasteCellChanges(
  clipboard: ClipboardData,
  originX: number,
  originY: number,
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
): CellChange[] {
  const changes: CellChange[] = [];
  const { width, height, pixels: clipPixels } = clipboard;

  for (let ly = 0; ly < height; ly++) {
    for (let lx = 0; lx < width; lx++) {
      const gx = originX + lx;
      const gy = originY + ly;
      if (gx < 0 || gy < 0 || gx >= gridWidth || gy >= gridHeight) {
        continue;
      }

      const next = clipPixels[ly * width + lx] ?? TRANSPARENT_INDEX;
      const previous = pixels[cellIndex(gx, gy, gridWidth)] ?? TRANSPARENT_INDEX;
      changes.push({ x: gx, y: gy, previous, next });
    }
  }

  return changes;
}

/** Single undo step for stamping clipboard pixels at an origin. */
export class PasteCellsCommand extends PaintCellsCommand implements Command {}
