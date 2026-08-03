import type { CellChange } from "@/state/commands/paintCells";

let pendingCellChanges: CellChange[] = [];

export function appendPendingCellChanges(changes: readonly CellChange[]): void {
  if (changes.length === 0) {
    return;
  }
  pendingCellChanges.push(...changes);
}

export function clearPendingCellChanges(): void {
  pendingCellChanges = [];
}

export function getPendingCellChanges(): readonly CellChange[] {
  return pendingCellChanges;
}
