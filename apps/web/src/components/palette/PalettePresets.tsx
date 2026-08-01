import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  useEditorStore,
  usePaletteLocked,
} from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import type { PalettePresetId } from "./palettePresets";
import { PalettePresetGrid } from "./PalettePresetGrid";

type PalettePresetsProps = {
  className?: string;
};

export function PalettePresets({ className }: PalettePresetsProps) {
  const locked = usePaletteLocked();
  const applyPalettePreset = useEditorStore((s) => s.applyPalettePreset);
  const lastPreset = useSessionStore((s) => s.lastPalettePreset);
  const setLastPalettePreset = useSessionStore((s) => s.setLastPalettePreset);

  const handleApply = (id: PalettePresetId, colors: readonly string[]) => {
    applyPalettePreset(colors);
    setLastPalettePreset(id);
  };

  return (
    <div className={cn("flex flex-col gap-2 border-t border-border p-3", className)}>
      <span className="text-sm font-medium text-primary">
        {copy.palettePresetsLabel}
      </span>
      <PalettePresetGrid
        selectedId={lastPreset}
        disabled={locked}
        onSelect={(preset) => handleApply(preset.id, preset.colors)}
      />
    </div>
  );
}
