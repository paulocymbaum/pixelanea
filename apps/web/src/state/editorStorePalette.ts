import {
  PALETTE_MAX_COLORS,
  PALETTE_MIN_COLORS,
  normalizeHex,
  remapPixelsAfterRemove,
} from "@/state/paletteUtils";
import {
  flushPaletteSync,
  scheduleFrameSync,
  schedulePaletteSync,
} from "@/state/persist";
import { writeFramePixels } from "@/state/frameCache";
import { SetPaletteColorsCommand } from "@/state/commands/setPaletteColors";
import {
  dispatchCommands,
  type CommandStoreGet,
  type CommandStoreSet,
} from "@/state/editorStoreCommands";

type PaletteStoreGet = () => ReturnType<CommandStoreGet> & {
  paletteLocked: boolean;
};

export function createPaletteActions(
  get: PaletteStoreGet,
  set: CommandStoreSet,
) {
  return {
    applyPalettePreset: (colors: readonly string[]) => {
      if (colors.length === 0) {
        return;
      }

      const state = get();
      if (state.paletteLocked) {
        return;
      }

      dispatchCommands(
        get,
        set,
        new SetPaletteColorsCommand(
          state.paletteColors,
          state.activeColorIndex,
          colors,
        ),
      );
    },

    addPaletteColor: (hexInput: string) => {
      const normalized = normalizeHex(hexInput);
      if (!normalized) {
        return;
      }

      const state = get();
      if (
        state.paletteLocked ||
        state.paletteColors.length >= PALETTE_MAX_COLORS
      ) {
        return;
      }

      const paletteColors = [...state.paletteColors, normalized];
      set({
        paletteColors,
        activeColorIndex: paletteColors.length - 1,
        isPaletteDirty: true,
        bundleDirty: true,
        paletteSyncStatus: "idle",
        paletteSyncError: null,
      });
      schedulePaletteSync();
    },

    updatePaletteColor: (index: number, hexInput: string) => {
      const normalized = normalizeHex(hexInput);
      if (!normalized) {
        return;
      }

      const state = get();
      if (
        state.paletteLocked ||
        index < 0 ||
        index >= state.paletteColors.length
      ) {
        return;
      }

      const paletteColors = [...state.paletteColors];
      paletteColors[index] = normalized;

      set({
        paletteColors,
        isPaletteDirty: true,
        bundleDirty: true,
        paletteSyncStatus: "idle",
        paletteSyncError: null,
      });
      schedulePaletteSync();
    },

    savePalette: () => {
      void flushPaletteSync();
    },

    removePaletteColor: (index: number) => {
      const state = get();
      if (
        state.paletteLocked ||
        index < 0 ||
        index >= state.paletteColors.length ||
        state.paletteColors.length <= PALETTE_MIN_COLORS
      ) {
        return;
      }

      const paletteColors = state.paletteColors.filter((_, i) => i !== index);
      const pixels = remapPixelsAfterRemove(state.pixels, index);

      let activeColorIndex = state.activeColorIndex;
      if (index === activeColorIndex) {
        activeColorIndex = 0;
      } else if (index < activeColorIndex) {
        activeColorIndex -= 1;
      }

      set({
        paletteColors,
        pixels,
        framePixelsByIndex: writeFramePixels(
          state.framePixelsByIndex,
          state.activeFrameIndex,
          pixels,
        ),
        activeColorIndex,
        isDirty: true,
        isPaletteDirty: true,
        bundleDirty: true,
        frameSyncStatus: "idle",
        paletteSyncStatus: "idle",
        frameSyncError: null,
        paletteSyncError: null,
      });

      scheduleFrameSync();
      schedulePaletteSync();
    },
  };
}
