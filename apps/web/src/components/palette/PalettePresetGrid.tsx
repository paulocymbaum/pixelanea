import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  PALETTE_PRESETS,
  palettePresetLabel,
  type PalettePreset,
  type PalettePresetId,
} from "./palettePresets";

export type PalettePresetGridProps = {
  selectedId?: PalettePresetId | null;
  onSelect: (preset: PalettePreset) => void;
  disabled?: boolean;
  showSwatchPreview?: boolean;
  className?: string;
};

export function PalettePresetGrid({
  selectedId = null,
  onSelect,
  disabled = false,
  showSwatchPreview = false,
  className,
}: PalettePresetGridProps) {
  const selectedPreset = selectedId
    ? PALETTE_PRESETS.find((preset) => preset.id === selectedId)
    : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        {PALETTE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={selectedId === preset.id ? "primary" : "secondary"}
            size="default"
            disabled={disabled}
            onClick={() => onSelect(preset)}
            className="min-h-10"
            aria-pressed={selectedId === preset.id}
          >
            {palettePresetLabel(preset.id)}
          </Button>
        ))}
      </div>
      {showSwatchPreview && selectedPreset ? (
        <div className="flex gap-1">
          {selectedPreset.colors.map((color) => (
            <span
              key={color}
              className="h-8 w-8 rounded-swatch border border-border"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
