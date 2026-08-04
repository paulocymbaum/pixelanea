import {
  buildClearSelectionCellChanges,
  extractSelectionPixels,
} from "@/canvas/selectionExtraction";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import {
  computeClearSelectionChanges,
  computeExtractSelection,
  computePasteChanges,
} from "@/api/selectionCompute";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import type { Command } from "@/state/commands/types";
import { withSelectionMovingFeedback } from "@/state/selectionComputeFeedback";
import type { StoreApi } from "zustand";

export type ClipboardData = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

type ClipboardEditorSlice = {
  clipboard: ClipboardData | null;
};

export const initialClipboardState: ClipboardEditorSlice = {
  clipboard: null,
};

type ClipboardStore = ClipboardEditorSlice & {
  readOnly: boolean;
  selection: SelectionRect | null;
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  dispatch: (command: Command) => void;
  clearSelection: () => void;
  setSelection: (selection: SelectionRect) => void;
  startPastePreview: (originX?: number, originY?: number) => boolean;
  setSelectionMoving: (moving: boolean) => void;
};

export function createClipboardActions(
  get: StoreApi<ClipboardStore>["getState"],
  set: StoreApi<ClipboardEditorSlice>["setState"],
) {
  return {
    copySelection: async (): Promise<boolean> => {
      const state = get();
      const selection = state.selection;
      if (state.readOnly || !selection) {
        return false;
      }

      const extracted = await withSelectionMovingFeedback(
        () => state.setSelectionMoving(true),
        () => state.setSelectionMoving(false),
        () =>
          computeExtractSelection(
            state.pixels,
            state.gridWidth,
            state.gridHeight,
            selection,
          ),
      );
      if (!extracted) {
        return false;
      }

      set({ clipboard: extracted });
      return true;
    },

    cutSelection: async (): Promise<boolean> => {
      const state = get();
      const selection = state.selection;
      if (state.readOnly || !selection) {
        return false;
      }

      return withSelectionMovingFeedback(
        () => state.setSelectionMoving(true),
        () => state.setSelectionMoving(false),
        async () => {
          const extracted = await computeExtractSelection(
            state.pixels,
            state.gridWidth,
            state.gridHeight,
            selection,
          );
          if (!extracted) {
            return false;
          }

          const changes = await computeClearSelectionChanges(
            state.pixels,
            state.gridWidth,
            state.gridHeight,
            selection,
          );

          const originX = selection.x;
          const originY = selection.y;

          set({ clipboard: extracted });
          state.clearSelection();

          if (changes.length > 0) {
            state.dispatch(new PaintCellsCommand(changes));
          }

          state.startPastePreview(originX, originY);
          return true;
        },
      );
    },

    duplicateSelection: async (): Promise<boolean> => {
      const state = get();
      const selection = state.selection;
      if (state.readOnly || !selection) {
        return false;
      }

      return withSelectionMovingFeedback(
        () => state.setSelectionMoving(true),
        () => state.setSelectionMoving(false),
        async () => {
          const extracted = await computeExtractSelection(
            state.pixels,
            state.gridWidth,
            state.gridHeight,
            selection,
          );
          if (!extracted) {
            return false;
          }

          const originX = Math.min(
            selection.x + 1,
            state.gridWidth - selection.width,
          );
          const originY = Math.min(
            selection.y + 1,
            state.gridHeight - selection.height,
          );

          const changes = await computePasteChanges(
            extracted,
            originX,
            originY,
            state.pixels,
            state.gridWidth,
            state.gridHeight,
          );

          if (changes.length > 0) {
            state.dispatch(new PaintCellsCommand(changes));
          }

          state.setSelection({
            ...selection,
            x: originX,
            y: originY,
          });
          return true;
        },
      );
    },

    clearClipboard: () => set({ clipboard: null }),
  };
}

/** Local-only helpers for tests and offline fallbacks inside selectionCompute. */
export const clipboardLocalOps = {
  extractSelectionPixels,
  buildClearSelectionCellChanges,
};
