import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { PalettePresetGrid } from "./PalettePresetGrid";
import { usePalettePresetApply } from "./usePalettePresetApply";

type PalettePresetsProps = {
  className?: string;
};

export function PalettePresets({ className }: PalettePresetsProps) {
  const {
    applyPreset,
    applySourcePalette,
    hasSourcePalette,
    locked,
    lastPreset,
  } = usePalettePresetApply();

  return (
    <div className={cn("flex flex-col gap-2 border-t border-border p-3", className)}>
      <span className="text-sm font-medium text-primary">
        {copy.palettePresetsLabel}
      </span>
      <PalettePresetGrid
        selectedId={lastPreset}
        disabled={locked}
        showSourcePalette={hasSourcePalette}
        onSelectSource={applySourcePalette}
        onSelect={(preset) => applyPreset(preset.id, preset.colors)}
      />
    </div>
  );
}
