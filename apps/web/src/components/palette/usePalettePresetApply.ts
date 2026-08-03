import {
  useEditorStore,
  usePaletteLocked,
  useSourcePaletteColors,
} from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import type { PalettePresetId, PaletteSelectionId } from "./palettePresets";

export function usePalettePresetApply() {
  const locked = usePaletteLocked();
  const applyPalettePreset = useEditorStore((s) => s.applyPalettePreset);
  const sourcePaletteColors = useSourcePaletteColors();
  const lastPreset = useSessionStore((s) => s.lastPalettePreset);
  const setLastPalettePreset = useSessionStore((s) => s.setLastPalettePreset);

  const applyPreset = (id: PalettePresetId, colors: readonly string[]) => {
    applyPalettePreset(colors);
    setLastPalettePreset(id);
  };

  const applySourcePalette = () => {
    if (!sourcePaletteColors || sourcePaletteColors.length === 0) {
      return;
    }
    applyPalettePreset(sourcePaletteColors);
    setLastPalettePreset("source");
  };

  const hasSourcePalette = Boolean(
    sourcePaletteColors && sourcePaletteColors.length > 0,
  );

  return {
    applyPreset,
    applySourcePalette,
    hasSourcePalette,
    locked,
    lastPreset: lastPreset as PaletteSelectionId | null,
  };
}
