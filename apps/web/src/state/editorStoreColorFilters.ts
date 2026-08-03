import {
  computeFilterCellChanges,
  DEFAULT_COLOR_FILTER_SETTINGS,
  type ColorFilterSettings,
  type LightingPoint,
} from "@/lib/colorFilters";
import type { Command } from "@/state/commands/types";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import type { StoreApi } from "zustand";

type ColorFilterEditorSlice = {
  readOnly: boolean;
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  paletteColors: readonly string[];
  colorFilters: ColorFilterSettings;
  placingLighting: boolean;
  dispatch: (command: Command | Command[]) => void;
};

export function createColorFilterActions(
  get: StoreApi<ColorFilterEditorSlice>["getState"],
  set: StoreApi<ColorFilterEditorSlice>["setState"],
) {
  return {
    setColorFilterOverlayEnabled: (overlayEnabled: boolean) =>
      set((state) => ({
        colorFilters: { ...state.colorFilters, overlayEnabled },
      })),

    setColorFilterOverlayColor: (overlayColor: string) =>
      set((state) => ({
        colorFilters: { ...state.colorFilters, overlayColor },
      })),

    setColorFilterOverlayOpacity: (overlayOpacity: number) =>
      set((state) => ({
        colorFilters: {
          ...state.colorFilters,
          overlayOpacity: Math.max(0, Math.min(1, overlayOpacity)),
        },
      })),

    addColorFilterLightingPoint: (point: Omit<LightingPoint, "id">) =>
      set((state) => ({
        colorFilters: {
          ...state.colorFilters,
          lightingPoints: [
            ...state.colorFilters.lightingPoints,
            { ...point, id: crypto.randomUUID() },
          ],
        },
      })),

    removeColorFilterLightingPoint: (id: string) =>
      set((state) => ({
        colorFilters: {
          ...state.colorFilters,
          lightingPoints: state.colorFilters.lightingPoints.filter(
            (point) => point.id !== id,
          ),
        },
      })),

    updateColorFilterLightingPoint: (
      id: string,
      patch: Partial<Omit<LightingPoint, "id">>,
    ) =>
      set((state) => ({
        colorFilters: {
          ...state.colorFilters,
          lightingPoints: state.colorFilters.lightingPoints.map((point) =>
            point.id === id ? { ...point, ...patch } : point,
          ),
        },
      })),

    setPlacingLighting: (placingLighting: boolean) => set({ placingLighting }),

    resetColorFilters: () =>
      set({
        colorFilters: { ...DEFAULT_COLOR_FILTER_SETTINGS },
        placingLighting: false,
      }),

    applyColorFilters: () => {
      const state = get();
      if (state.readOnly) {
        return;
      }

      const changes = computeFilterCellChanges(
        state.pixels,
        state.gridWidth,
        state.gridHeight,
        state.paletteColors,
        state.colorFilters,
      );

      if (changes.length === 0) {
        return;
      }

      state.dispatch(new PaintCellsCommand(changes));
    },
  };
}
