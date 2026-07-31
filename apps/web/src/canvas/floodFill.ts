import { isCellInBounds, type CellCoord } from "./coordinates";

export function floodFill(
  getPixelIndex: (cell: CellCoord) => number,
  gridWidth: number,
  gridHeight: number,
  start: CellCoord,
  targetColor: number,
): CellCoord[] {
  if (!isCellInBounds(start, gridWidth, gridHeight)) {
    return [];
  }
  if (getPixelIndex(start) !== targetColor) {
    return [];
  }

  const filled: CellCoord[] = [];
  const visited = new Set<string>();
  const queue: CellCoord[] = [start];

  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key)) {
      continue;
    }
    if (!isCellInBounds(cell, gridWidth, gridHeight)) {
      continue;
    }
    if (getPixelIndex(cell) !== targetColor) {
      continue;
    }

    visited.add(key);
    filled.push(cell);

    queue.push(
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
    );
  }

  return filled;
}
