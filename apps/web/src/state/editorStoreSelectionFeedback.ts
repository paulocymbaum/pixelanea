import type { StoreApi } from "zustand";

type SelectionFeedbackSlice = {
  selectionMoving: boolean;
};

export const initialSelectionFeedbackState: SelectionFeedbackSlice = {
  selectionMoving: false,
};

export function createSelectionFeedbackActions(
  set: StoreApi<SelectionFeedbackSlice>["setState"],
) {
  return {
    setSelectionMoving: (selectionMoving: boolean) => set({ selectionMoving }),
  };
}
