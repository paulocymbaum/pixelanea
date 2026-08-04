import type { SelectionRect } from "@/canvas/selectionGeometry";
import { isCellInSelection } from "@/canvas/selectionGeometry";
import { extractSelectionPixels } from "@/canvas/selectionExtraction";
import type { CellCoord } from "@/canvas/coordinates";
import {
  buildMoveSelectionChanges,
  MoveSelectionCommand,
} from "@/state/commands/moveSelection";
import type { ClipboardData } from "@/state/editorStoreClipboard";
import type { StoreApi } from "zustand";

export type MovePreview = {
  originX: number;
  originY: number;
  clipboard: ClipboardData;
  sourceSelection: SelectionRect;
};

type MoveEditorSlice = {
  movePreview: MovePreview | null;
};

export const initialMoveState: MoveEditorSlice = {
  movePreview: null,
};

type MoveStore = MoveEditorSlice & {
  readOnly: boolean;
  selection: SelectionRect | null;
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  dispatch: (command: MoveSelectionCommand) => void;
  clearSelection: () => void;
  cancelPaste: () => void;
};

export function isCellInActiveSelection(
  cell: CellCoord,
  selection: SelectionRect | null,
): boolean {
  if (!selection) {
    return false;
  }
  return isCellInSelection(cell, selection);
}

export function createMoveActions(
  get: StoreApi<MoveStore>["getState"],
  set: StoreApi<MoveEditorSlice>["setState"],
) {
  return {
    startMovePreview: (): boolean => {
      const state = get();
      if (state.readOnly || !state.selection || state.movePreview) {
        return false;
      }

      const { selection, pixels, gridWidth, gridHeight } = state;
      const extracted = extractSelectionPixels(
        pixels,
        gridWidth,
        gridHeight,
        selection,
      );
      if (!extracted) {
        return false;
      }

      state.cancelPaste();
      set({
        movePreview: {
          originX: selection.x,
          originY: selection.y,
          clipboard: extracted,
          sourceSelection: selection,
        },
      });
      return true;
    },

    moveMovePreview: (originX: number, originY: number) => {
      const state = get();
      if (!state.movePreview) {
        return;
      }

      set({
        movePreview: {
          ...state.movePreview,
          originX,
          originY,
        },
      });
    },

    nudgeMovePreview: (deltaX: number, deltaY: number) => {
      const state = get();
      if (!state.movePreview) {
        return;
      }

      set({
        movePreview: {
          ...state.movePreview,
          originX: state.movePreview.originX + deltaX,
          originY: state.movePreview.originY + deltaY,
        },
      });
    },

    commitMove: (): boolean => {
      const state = get();
      if (state.readOnly || !state.movePreview) {
        return false;
      }

      const { originX, originY, sourceSelection, clipboard } = state.movePreview;
      const deltaX = originX - sourceSelection.x;
      const deltaY = originY - sourceSelection.y;

      const changes = buildMoveSelectionChanges(
        state.pixels,
        state.gridWidth,
        state.gridHeight,
        sourceSelection,
        deltaX,
        deltaY,
      );

      set({ movePreview: null });
      state.clearSelection();

      if (changes.length > 0) {
        state.dispatch(
          new MoveSelectionCommand(
            sourceSelection,
            deltaX,
            deltaY,
            clipboard,
            changes,
          ),
        );
      }

      return true;
    },

    cancelMove: () => set({ movePreview: null }),
  };
}
