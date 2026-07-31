import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  PALETTE_PRESETS,
  type PalettePresetId,
} from "@/components/palette/palettePresets";

const PRESET_COPY: Record<PalettePresetId, string> = {
  retro: copy.palettePresetRetro,
  gameboy: copy.palettePresetGameboy,
  monochrome: copy.palettePresetMonochrome,
};

type PalettePresetStepProps = {
  value: PalettePresetId;
  onChange: (value: PalettePresetId) => void;
};

export function PalettePresetStep({ value, onChange }: PalettePresetStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-secondary">{copy.importWizardPaletteHint}</p>
      <div className="flex flex-wrap gap-2">
        {PALETTE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={value === preset.id ? "primary" : "secondary"}
            className="min-h-10"
            onClick={() => onChange(preset.id)}
            aria-pressed={value === preset.id}
          >
            {PRESET_COPY[preset.id]}
          </Button>
        ))}
      </div>
      <div className="flex gap-1">
        {PALETTE_PRESETS.find((preset) => preset.id === value)?.colors.map(
          (color) => (
            <span
              key={color}
              className={cn("h-8 w-8 rounded-swatch border border-border")}
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ),
        )}
      </div>
    </div>
  );
}
