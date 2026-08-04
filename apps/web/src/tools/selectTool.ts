import {
  isCellInSelection,
  selectionBbox,
  selectionShapeFromModifiers,
} from "@/canvas/selectionGeometry";
import { isCKeyHeld } from "@/canvas/selectionModifiers";
import type { CellCoord } from "@/canvas/coordinates";
import { useEditorStore } from "@/state/editorStore";
import type { Tool } from "./types";

let selectAnchor: CellCoord | null = null;
let moveDragAnchor: CellCoord | null = null;

export function getSelectAnchor(): CellCoord | null {
  return selectAnchor;
}

export function resetSelectAnchor(): void {
  selectAnchor = null;
  moveDragAnchor = null;
}

function selectionFromPointer(
  anchor: CellCoord,
  current: CellCoord,
  event: PointerEvent,
) {
  const shape = selectionShapeFromModifiers(event.shiftKey, isCKeyHeld());
  return selectionBbox(anchor, current, shape);
}

export const selectTool: Tool = {
  id: "select",
  cursor: "crosshair",
  onPointerDown(_event, cell, ctx) {
    if (ctx.readOnly) {
      selectAnchor = null;
      moveDragAnchor = null;
      return;
    }

    const state = useEditorStore.getState();
    const { selection } = state;

    if (
      selection &&
      !state.pastePreview &&
      !state.movePreview &&
      isCellInSelection(cell, selection)
    ) {
      selectAnchor = null;
      moveDragAnchor = cell;
      state.startMovePreview();
      return;
    }

    if (
      selection &&
      !state.pastePreview &&
      !state.movePreview &&
      !isCellInSelection(cell, selection)
    ) {
      moveDragAnchor = null;
      selectAnchor = cell;
      ctx.setSelectionPreview(null);
      return;
    }

    moveDragAnchor = null;
    selectAnchor = cell;
    ctx.setSelectionPreview(null);
  },
  onPointerUp(event, cell, ctx) {
    if (ctx.readOnly) {
      selectAnchor = null;
      moveDragAnchor = null;
      ctx.setSelectionPreview(null);
      return;
    }

    if (moveDragAnchor) {
      moveDragAnchor = null;
      void useEditorStore.getState().commitMove();
      return;
    }

    if (!selectAnchor) {
      ctx.setSelectionPreview(null);
      return;
    }

    const anchor = selectAnchor;
    selectAnchor = null;

    if (
      anchor.x === cell.x &&
      anchor.y === cell.y &&
      useEditorStore.getState().selection &&
      !isCellInSelection(cell, useEditorStore.getState().selection!)
    ) {
      ctx.setSelectionPreview(null);
      useEditorStore.getState().clearSelection();
      return;
    }

    const selection = selectionFromPointer(anchor, cell, event);
    ctx.setSelectionPreview(null);
    ctx.setSelection(selection);
  },
};

export function previewSelectionFromPointer(
  anchor: CellCoord,
  current: CellCoord,
  event: PointerEvent,
) {
  return selectionFromPointer(anchor, current, event);
}

export function previewMoveFromPointer(
  anchor: CellCoord,
  current: CellCoord,
): { originX: number; originY: number } | null {
  const state = useEditorStore.getState();
  const preview = state.movePreview;
  if (!preview) {
    return null;
  }

  const { sourceSelection } = preview;
  return {
    originX: sourceSelection.x + (current.x - anchor.x),
    originY: sourceSelection.y + (current.y - anchor.y),
  };
}

export function getMoveDragAnchor(): CellCoord | null {
  return moveDragAnchor;
}
