import {
  selectionBbox,
  selectionShapeFromModifiers,
} from "@/canvas/selectionGeometry";
import { isCKeyHeld } from "@/canvas/selectionModifiers";
import type { CellCoord } from "@/canvas/coordinates";
import type { Tool } from "./types";

let selectAnchor: CellCoord | null = null;

export function getSelectAnchor(): CellCoord | null {
  return selectAnchor;
}

export function resetSelectAnchor(): void {
  selectAnchor = null;
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
      return;
    }
    selectAnchor = cell;
    ctx.setSelectionPreview(null);
  },
  onPointerUp(event, cell, ctx) {
    if (ctx.readOnly || !selectAnchor) {
      selectAnchor = null;
      ctx.setSelectionPreview(null);
      return;
    }

    const anchor = selectAnchor;
    selectAnchor = null;
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
