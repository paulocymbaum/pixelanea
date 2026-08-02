import {
  useEditorStore,
  usePaletteLocked,
} from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import type { PalettePresetId } from "./palettePresets";

export function usePalettePresetApply() {
  const locked = usePaletteLocked();
  const applyPalettePreset = useEditorStore((s) => s.applyPalettePreset);
  const lastPreset = useSessionStore((s) => s.lastPalettePreset);
  const setLastPalettePreset = useSessionStore((s) => s.setLastPalettePreset);

  const applyPreset = (id: PalettePresetId, colors: readonly string[]) => {
    applyPalettePreset(colors);
    setLastPalettePreset(id);
  };

  return { applyPreset, locked, lastPreset };
}
