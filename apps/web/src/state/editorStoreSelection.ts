import type { SelectionRect } from "@/canvas/selectionGeometry";
import type { StoreApi } from "zustand";

type SelectionEditorSlice = {
  selection: SelectionRect | null;
  selectionPreview: SelectionRect | null;
};

export const initialSelectionState: SelectionEditorSlice = {
  selection: null,
  selectionPreview: null,
};

type SelectionStore = SelectionEditorSlice & {
  gridWidth: number;
  gridHeight: number;
};

function clampSelectionOrigin(
  selection: SelectionRect,
  gridWidth: number,
  gridHeight: number,
  deltaX: number,
  deltaY: number,
): SelectionRect {
  const maxX = Math.max(0, gridWidth - selection.width);
  const maxY = Math.max(0, gridHeight - selection.height);
  return {
    ...selection,
    x: Math.min(maxX, Math.max(0, selection.x + deltaX)),
    y: Math.min(maxY, Math.max(0, selection.y + deltaY)),
  };
}

export function createSelectionActions(
  get: StoreApi<SelectionStore>["getState"],
  set: StoreApi<SelectionEditorSlice>["setState"],
) {
  return {
    setSelection: (selection: SelectionRect | null) =>
      set({ selection, selectionPreview: null }),
    clearSelection: () => set({ selection: null, selectionPreview: null }),
    setSelectionPreview: (selectionPreview: SelectionRect | null) =>
      set({ selectionPreview }),
    nudgeSelection: (deltaX: number, deltaY: number) => {
      const state = get();
      const selection = state.selection;
      if (!selection) {
        return;
      }

      set({
        selection: clampSelectionOrigin(
          selection,
          state.gridWidth,
          state.gridHeight,
          deltaX,
          deltaY,
        ),
        selectionPreview: null,
      });
    },
  };
}
