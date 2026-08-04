import {
  buildClearSelectionCellChanges,
  extractSelectionPixels,
  type SelectionClipboard,
} from "@/canvas/selectionExtraction";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import { buildPasteCellChanges } from "@/state/commands/pasteCells";
import type { CellChange } from "@/state/commands/paintCells";
import { getApiClient } from "@/api/client";

export type SelectionOperation =
  | "extract"
  | "clear_changes"
  | "paste_changes"
  | "move_changes";

const COMPUTE_CELL_THRESHOLD = 64;

function selectionCellCount(selection: SelectionRect): number {
  return selection.width * selection.height;
}

function pixelsToApiArray(pixels: Uint8Array): number[] {
  return Array.from(pixels);
}

function clipboardFromApi(
  clipboard: { width: number; height: number; pixels: number[] },
): SelectionClipboard {
  const out = new Uint8Array(clipboard.width * clipboard.height);
  for (let i = 0; i < out.length; i++) {
    out[i] = clipboard.pixels[i] ?? 0;
  }
  return { width: clipboard.width, height: clipboard.height, pixels: out };
}

function changesFromApi(
  changes: readonly { x: number; y: number; previous: number; next: number }[],
): CellChange[] {
  return changes.map((change) => ({
    x: change.x,
    y: change.y,
    previous: change.previous,
    next: change.next,
  }));
}

function shouldUseRemoteCompute(selection?: SelectionRect): boolean {
  if (!selection) {
    return true;
  }
  return selectionCellCount(selection) > COMPUTE_CELL_THRESHOLD;
}

export async function computeExtractSelection(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  selection: SelectionRect,
): Promise<SelectionClipboard | null> {
  const local = () =>
    extractSelectionPixels(pixels, gridWidth, gridHeight, selection);

  if (!shouldUseRemoteCompute(selection)) {
    return local();
  }

  try {
    const response = await getApiClient().computeSelection({
      gridWidth,
      gridHeight,
      pixels: pixelsToApiArray(pixels),
      selection,
      operation: "extract",
    });
    if (!response.clipboard) {
      return local();
    }
    return clipboardFromApi(response.clipboard);
  } catch {
    return local();
  }
}

export async function computeClearSelectionChanges(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  selection: SelectionRect,
): Promise<CellChange[]> {
  const local = () =>
    buildClearSelectionCellChanges(pixels, gridWidth, gridHeight, selection);

  if (!shouldUseRemoteCompute(selection)) {
    return local();
  }

  try {
    const response = await getApiClient().computeSelection({
      gridWidth,
      gridHeight,
      pixels: pixelsToApiArray(pixels),
      selection,
      operation: "clear_changes",
    });
    if (!response.changes) {
      return local();
    }
    return changesFromApi(response.changes);
  } catch {
    return local();
  }
}

export async function computePasteChanges(
  clipboard: SelectionClipboard,
  originX: number,
  originY: number,
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
): Promise<CellChange[]> {
  const local = () =>
    buildPasteCellChanges(
      clipboard,
      originX,
      originY,
      pixels,
      gridWidth,
      gridHeight,
    );

  if (clipboard.width * clipboard.height <= COMPUTE_CELL_THRESHOLD) {
    return local();
  }

  try {
    const response = await getApiClient().computeSelection({
      gridWidth,
      gridHeight,
      pixels: pixelsToApiArray(pixels),
      operation: "paste_changes",
      clipboard: {
        width: clipboard.width,
        height: clipboard.height,
        pixels: pixelsToApiArray(clipboard.pixels),
      },
      origin: { x: originX, y: originY },
    });
    if (!response.changes) {
      return local();
    }
    return changesFromApi(response.changes);
  } catch {
    return local();
  }
}

export async function computeMoveSelectionChanges(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  selection: SelectionRect,
  deltaX: number,
  deltaY: number,
): Promise<CellChange[]> {
  const local = async (): Promise<CellChange[]> => {
    const extracted = extractSelectionPixels(
      pixels,
      gridWidth,
      gridHeight,
      selection,
    );
    if (!extracted) {
      return [];
    }
    const clearChanges = buildClearSelectionCellChanges(
      pixels,
      gridWidth,
      gridHeight,
      selection,
    );
    const merged = new Uint8Array(pixels);
    for (const change of clearChanges) {
      merged[change.y * gridWidth + change.x] = change.next;
    }
    const pasteChanges = buildPasteCellChanges(
      extracted,
      selection.x + deltaX,
      selection.y + deltaY,
      merged,
      gridWidth,
      gridHeight,
    );
    return [...clearChanges, ...pasteChanges];
  };

  if (!shouldUseRemoteCompute(selection)) {
    return local();
  }

  try {
    const response = await getApiClient().computeSelection({
      gridWidth,
      gridHeight,
      pixels: pixelsToApiArray(pixels),
      selection,
      operation: "move_changes",
      delta: { x: deltaX, y: deltaY },
    });
    if (!response.changes) {
      return local();
    }
    return changesFromApi(response.changes);
  } catch {
    return local();
  }
}
