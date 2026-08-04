import type { CellCoord } from "@/canvas/coordinates";
import { PasteCellsCommand } from "@/state/commands/pasteCells";
import { computePasteChanges } from "@/api/selectionCompute";
import type { ClipboardData } from "@/state/editorStoreClipboard";
import { withSelectionMovingFeedback } from "@/state/selectionComputeFeedback";
import type { StoreApi } from "zustand";

export type PastePreview = {
  originX: number;
  originY: number;
  clipboard: ClipboardData;
};

type PasteEditorSlice = {
  pastePreview: PastePreview | null;
};

export const initialPasteState: PasteEditorSlice = {
  pastePreview: null,
};

type PasteStore = PasteEditorSlice & {
  readOnly: boolean;
  clipboard: ClipboardData | null;
  hoverCell: CellCoord | null;
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  dispatch: (command: PasteCellsCommand) => void;
  clearSelection: () => void;
  cancelMove: () => void;
  setSelectionMoving: (moving: boolean) => void;
};

export function createPasteActions(
  get: StoreApi<PasteStore>["getState"],
  set: StoreApi<PasteEditorSlice>["setState"],
) {
  return {
    startPastePreview: (originX?: number, originY?: number): boolean => {
      const state = get();
      if (state.readOnly || !state.clipboard) {
        return false;
      }

      const anchor = state.hoverCell;
      const x = originX ?? anchor?.x ?? 0;
      const y = originY ?? anchor?.y ?? 0;

      state.cancelMove();
      set({
        pastePreview: {
          originX: x,
          originY: y,
          clipboard: state.clipboard,
        },
      });
      return true;
    },

    movePastePreview: (x: number, y: number) => {
      const state = get();
      if (!state.pastePreview) {
        return;
      }

      set({
        pastePreview: {
          ...state.pastePreview,
          originX: x,
          originY: y,
        },
      });
    },

    nudgePastePreview: (deltaX: number, deltaY: number) => {
      const state = get();
      if (!state.pastePreview) {
        return;
      }

      set({
        pastePreview: {
          ...state.pastePreview,
          originX: state.pastePreview.originX + deltaX,
          originY: state.pastePreview.originY + deltaY,
        },
      });
    },

    commitPaste: async (): Promise<boolean> => {
      const state = get();
      if (state.readOnly || !state.pastePreview) {
        return false;
      }

      const { originX, originY, clipboard } = state.pastePreview;
      const changes = await withSelectionMovingFeedback(
        () => state.setSelectionMoving(true),
        () => state.setSelectionMoving(false),
        () =>
          computePasteChanges(
            clipboard,
            originX,
            originY,
            state.pixels,
            state.gridWidth,
            state.gridHeight,
          ),
      );

      set({ pastePreview: null });
      state.clearSelection();

      if (changes.length > 0) {
        state.dispatch(new PasteCellsCommand(changes));
      }

      return true;
    },

    cancelPaste: () => set({ pastePreview: null }),
  };
}
