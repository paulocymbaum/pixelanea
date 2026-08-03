import type { CellCoord } from "@/canvas/coordinates";
import type { CellChange } from "@/state/commands/paintCells";

const previewByKey = new Map<string, CellChange>();

function cellKey(cell: CellCoord): string {
  return `${cell.x},${cell.y}`;
}

/** Clear stroke preview overlay (pointer-up or cancel). */
export function clearStrokePreview(): void {
  previewByKey.clear();
}

/** Reset at stroke begin. */
export function resetStrokePreview(): void {
  previewByKey.clear();
}

/** Merge preview cell updates without touching committed store pixels. */
export function applyStrokePreview(changes: readonly CellChange[]): void {
  for (const change of changes) {
    const key = cellKey(change);
    const existing = previewByKey.get(key);
    if (existing) {
      existing.next = change.next;
      continue;
    }
    previewByKey.set(key, { ...change });
  }
}

export function getStrokePreviewChanges(): readonly CellChange[] {
  return Array.from(previewByKey.values());
}

/** Resolve pixel index for tool input during an active stroke. */
export function getStrokePreviewIndex(
  cell: CellCoord,
  gridWidth: number,
  basePixels: Uint8Array,
): number {
  const preview = previewByKey.get(cellKey(cell));
  if (preview) {
    return preview.next;
  }
  return basePixels[cell.y * gridWidth + cell.x] ?? 0;
}

/** Build render buffer: committed pixels plus in-flight stroke overlay. */
export function mergeStrokePreviewIntoPixels(
  basePixels: Uint8Array,
  gridWidth: number,
): Uint8Array {
  if (previewByKey.size === 0) {
    return basePixels;
  }

  const merged = new Uint8Array(basePixels);
  for (const change of previewByKey.values()) {
    merged[change.y * gridWidth + change.x] = change.next;
  }
  return merged;
}
