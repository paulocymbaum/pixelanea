import { describe, expect, it } from "vitest";
import type { CellChange } from "@/state/commands/paintCells";

/** Typical horizontal paint stroke at row 0 (matches paintMatrix harness). */
function rowStrokeChanges(width: number, count: number): CellChange[] {
  const changes: CellChange[] = [];
  for (let x = 0; x < count; x++) {
    changes.push({ x, y: 0, previous: 0, next: 2 });
  }
  return changes;
}

function deltaPayloadBytes(changes: readonly CellChange[]): number {
  return JSON.stringify(changes).length;
}

/** Gate from Batch 2 spike: delta must beat full-frame PUT by >30%. */
const MIN_DELTA_SAVINGS_RATIO = 0.3;

describe("frame sync payload spike (Batch 2)", () => {
  it("64×64 stroke: delta PATCH is >30% smaller than full binary PUT", () => {
    const gridSize = 64;
    const strokeCells = 64;
    const fullPutBytes = gridSize * gridSize;
    const deltaBytes = deltaPayloadBytes(rowStrokeChanges(gridSize, strokeCells));

    const savings = 1 - deltaBytes / fullPutBytes;
    expect(savings).toBeGreaterThan(MIN_DELTA_SAVINGS_RATIO);
  });

  it("128×128 stroke: delta PATCH is >30% smaller than full binary PUT", () => {
    const gridSize = 128;
    const strokeCells = 64;
    const fullPutBytes = gridSize * gridSize;
    const deltaBytes = deltaPayloadBytes(rowStrokeChanges(gridSize, strokeCells));

    const savings = 1 - deltaBytes / fullPutBytes;
    expect(savings).toBeGreaterThan(MIN_DELTA_SAVINGS_RATIO);
  });
});
