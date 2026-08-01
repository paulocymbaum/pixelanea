import { copy } from "@/content/copy";
import { PalettePresetGrid } from "@/components/palette/PalettePresetGrid";
import type { PalettePresetId } from "@/components/palette/palettePresets";

type PalettePresetStepProps = {
  value: PalettePresetId;
  onChange: (value: PalettePresetId) => void;
};

export function PalettePresetStep({ value, onChange }: PalettePresetStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-secondary">{copy.importWizardPaletteHint}</p>
      <PalettePresetGrid
        selectedId={value}
        showSwatchPreview
        onSelect={(preset) => onChange(preset.id)}
      />
    </div>
  );
}
