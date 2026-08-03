import {
  buildClearSelectionCellChanges,
  extractSelectionPixels,
} from "@/canvas/selectionExtraction";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import type { Command } from "@/state/commands/types";
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
};

export function createClipboardActions(
  get: StoreApi<ClipboardStore>["getState"],
  set: StoreApi<ClipboardEditorSlice>["setState"],
) {
  return {
    copySelection: (): boolean => {
      const state = get();
      if (state.readOnly || !state.selection) {
        return false;
      }

      const extracted = extractSelectionPixels(
        state.pixels,
        state.gridWidth,
        state.gridHeight,
        state.selection,
      );
      if (!extracted) {
        return false;
      }

      set({ clipboard: extracted });
      return true;
    },

    cutSelection: (): boolean => {
      const state = get();
      if (state.readOnly || !state.selection) {
        return false;
      }

      const extracted = extractSelectionPixels(
        state.pixels,
        state.gridWidth,
        state.gridHeight,
        state.selection,
      );
      if (!extracted) {
        return false;
      }

      const changes = buildClearSelectionCellChanges(
        state.pixels,
        state.gridWidth,
        state.gridHeight,
        state.selection,
      );

      set({ clipboard: extracted });

      if (changes.length > 0) {
        state.dispatch(new PaintCellsCommand(changes));
      }

      return true;
    },

    clearClipboard: () => set({ clipboard: null }),
  };
}
