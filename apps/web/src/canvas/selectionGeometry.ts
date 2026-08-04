import type { CellCoord } from "@/canvas/coordinates";

export type SelectionShape = "rect" | "square" | "ellipse";

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: SelectionShape;
};

export function selectionShapeFromModifiers(
  shiftKey: boolean,
  cKeyHeld: boolean,
): SelectionShape {
  if (shiftKey && cKeyHeld) {
    return "ellipse";
  }
  if (shiftKey) {
    return "square";
  }
  return "rect";
}

/** Axis-aligned bbox from anchor cell to current cell (both inclusive). */
export function rectSelectionBbox(
  anchor: CellCoord,
  current: CellCoord,
): SelectionRect {
  const x = Math.min(anchor.x, current.x);
  const y = Math.min(anchor.y, current.y);
  const width = Math.abs(current.x - anchor.x) + 1;
  const height = Math.abs(current.y - anchor.y) + 1;

  return { x, y, width, height, shape: "rect" };
}

/** Square bbox with side = max(|dx|, |dy|) + 1 cells, anchored at pointer-down cell. */
export function squareSelectionBbox(
  anchor: CellCoord,
  current: CellCoord,
): SelectionRect {
  const dx = current.x - anchor.x;
  const dy = current.y - anchor.y;
  const side = Math.max(Math.abs(dx), Math.abs(dy)) + 1;
  const x = dx >= 0 ? anchor.x : anchor.x - (side - 1);
  const y = dy >= 0 ? anchor.y : anchor.y - (side - 1);

  return { x, y, width: side, height: side, shape: "square" };
}

/** Ellipse selection uses the drag bbox; cells are filtered by ellipse hit test. */
export function ellipseSelectionBbox(
  anchor: CellCoord,
  current: CellCoord,
): SelectionRect {
  const rect = rectSelectionBbox(anchor, current);
  return { ...rect, shape: "ellipse" };
}

export function selectionBbox(
  anchor: CellCoord,
  current: CellCoord,
  shape: SelectionShape,
): SelectionRect {
  switch (shape) {
    case "square":
      return squareSelectionBbox(anchor, current);
    case "ellipse":
      return ellipseSelectionBbox(anchor, current);
    default:
      return rectSelectionBbox(anchor, current);
  }
}

function ellipseRadii(selection: SelectionRect): { cx: number; cy: number; rx: number; ry: number } {
  const cx = selection.x + (selection.width - 1) / 2;
  const cy = selection.y + (selection.height - 1) / 2;
  const rx = (selection.width - 1) / 2;
  const ry = (selection.height - 1) / 2;
  return { cx, cy, rx, ry };
}

/** True when the cell center lies inside the ellipse inscribed in the selection bbox. */
export function isCellInEllipseSelection(
  cell: CellCoord,
  selection: SelectionRect,
): boolean {
  if (selection.shape !== "ellipse") {
    return (
      cell.x >= selection.x &&
      cell.x < selection.x + selection.width &&
      cell.y >= selection.y &&
      cell.y < selection.y + selection.height
    );
  }

  const { cx, cy, rx, ry } = ellipseRadii(selection);

  if (rx === 0 && ry === 0) {
    return cell.x === Math.round(cx) && cell.y === Math.round(cy);
  }

  if (rx === 0) {
    return cell.x === Math.round(cx) && Math.abs(cell.y - cy) <= ry;
  }

  if (ry === 0) {
    return cell.y === Math.round(cy) && Math.abs(cell.x - cx) <= rx;
  }

  const nx = (cell.x - cx) / rx;
  const ny = (cell.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

/** True when a cell lies inside the selection mask (clipped to bbox). */
export function isCellInSelection(
  cell: CellCoord,
  selection: SelectionRect,
): boolean {
  if (
    cell.x < selection.x ||
    cell.y < selection.y ||
    cell.x >= selection.x + selection.width ||
    cell.y >= selection.y + selection.height
  ) {
    return false;
  }

  if (selection.shape === "ellipse") {
    return isCellInEllipseSelection(cell, selection);
  }

  return true;
}

/** Cells included in the selection, clipped to grid bounds when provided. */
export function cellsInSelection(
  selection: SelectionRect,
  gridWidth?: number,
  gridHeight?: number,
): CellCoord[] {
  const cells: CellCoord[] = [];

  for (let y = selection.y; y < selection.y + selection.height; y += 1) {
    for (let x = selection.x; x < selection.x + selection.width; x += 1) {
      if (
        gridWidth !== undefined &&
        gridHeight !== undefined &&
        (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight)
      ) {
        continue;
      }

      const cell = { x, y };
      if (selection.shape === "ellipse") {
        if (!isCellInEllipseSelection(cell, selection)) {
          continue;
        }
      }

      cells.push(cell);
    }
  }

  return cells;
}
