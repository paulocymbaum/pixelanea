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

export function createSelectionActions(
  set: StoreApi<SelectionEditorSlice>["setState"],
) {
  return {
    setSelection: (selection: SelectionRect | null) =>
      set({ selection, selectionPreview: null }),
    clearSelection: () => set({ selection: null, selectionPreview: null }),
    setSelectionPreview: (selectionPreview: SelectionRect | null) =>
      set({ selectionPreview }),
  };
}
