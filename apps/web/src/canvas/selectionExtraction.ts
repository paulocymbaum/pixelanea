import { isCellInEllipseSelection } from "@/canvas/selectionGeometry";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import type { CellChange } from "@/state/commands/paintCells";
import { cellIndex, TRANSPARENT_INDEX } from "@/state/commands/types";

export type SelectionClipboard = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

function isCellIncluded(cellX: number, cellY: number, selection: SelectionRect): boolean {
  if (selection.shape === "ellipse") {
    return isCellInEllipseSelection({ x: cellX, y: cellY }, selection);
  }
  return true;
}

/** Extract palette indices for the current selection; cells outside the mask are transparent. */
export function extractSelectionPixels(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  selection: SelectionRect,
): SelectionClipboard | null {
  const { x, y, width, height } = selection;
  if (width <= 0 || height <= 0) {
    return null;
  }

  const out = new Uint8Array(width * height);

  for (let ly = 0; ly < height; ly++) {
    for (let lx = 0; lx < width; lx++) {
      const gx = x + lx;
      const gy = y + ly;
      const outIndex = ly * width + lx;

      if (
        !isCellIncluded(gx, gy, selection) ||
        gx < 0 ||
        gy < 0 ||
        gx >= gridWidth ||
        gy >= gridHeight
      ) {
        out[outIndex] = TRANSPARENT_INDEX;
        continue;
      }

      out[outIndex] = pixels[gy * gridWidth + gx] ?? TRANSPARENT_INDEX;
    }
  }

  return { width, height, pixels: out };
}

/** Build undoable cell changes that clear non-transparent pixels inside the selection mask. */
export function buildClearSelectionCellChanges(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  selection: SelectionRect,
): CellChange[] {
  const { x, y, width, height } = selection;
  if (width <= 0 || height <= 0) {
    return [];
  }

  const changes: CellChange[] = [];

  for (let ly = 0; ly < height; ly++) {
    for (let lx = 0; lx < width; lx++) {
      const gx = x + lx;
      const gy = y + ly;

      if (
        !isCellIncluded(gx, gy, selection) ||
        gx < 0 ||
        gy < 0 ||
        gx >= gridWidth ||
        gy >= gridHeight
      ) {
        continue;
      }

      const index = cellIndex(gx, gy, gridWidth);
      const previous = pixels[index] ?? TRANSPARENT_INDEX;
      if (previous === TRANSPARENT_INDEX) {
        continue;
      }

      changes.push({ x: gx, y: gy, previous, next: TRANSPARENT_INDEX });
    }
  }

  return changes;
}
