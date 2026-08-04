import {
  buildClearSelectionCellChanges,
  extractSelectionPixels,
} from "@/canvas/selectionExtraction";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import type { ClipboardData } from "@/state/editorStoreClipboard";
import { buildPasteCellChanges } from "@/state/commands/pasteCells";
import type { Command } from "./types";
import { PaintCellsCommand, type CellChange } from "./paintCells";

/** Build one undo step: clear masked source, stamp clipboard at delta. */
export function buildMoveSelectionChanges(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  selection: SelectionRect,
  deltaX: number,
  deltaY: number,
): CellChange[] {
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
}

/** Single undo step for repositioning a masked selection. */
export class MoveSelectionCommand extends PaintCellsCommand implements Command {
  constructor(
    readonly selection: SelectionRect,
    readonly deltaX: number,
    readonly deltaY: number,
    readonly clipboard: ClipboardData,
    changes: readonly CellChange[],
  ) {
    super(changes);
  }
}
