import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  PALETTE_PRESETS,
  palettePresetLabel,
  type PalettePreset,
  type PaletteSelectionId,
} from "./palettePresets";

export type PalettePresetGridProps = {
  selectedId?: PaletteSelectionId | null;
  onSelect: (preset: PalettePreset) => void;
  onSelectSource?: () => void;
  showSourcePalette?: boolean;
  disabled?: boolean;
  showSwatchPreview?: boolean;
  className?: string;
};

export function PalettePresetGrid({
  selectedId = null,
  onSelect,
  onSelectSource,
  showSourcePalette = false,
  disabled = false,
  showSwatchPreview = false,
  className,
}: PalettePresetGridProps) {
  const selectedPreset =
    selectedId && selectedId !== "source"
      ? PALETTE_PRESETS.find((preset) => preset.id === selectedId)
      : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        {showSourcePalette && onSelectSource ? (
          <Button
            type="button"
            variant={selectedId === "source" ? "primary" : "secondary"}
            size="default"
            disabled={disabled}
            onClick={onSelectSource}
            className="min-h-10"
            aria-pressed={selectedId === "source"}
          >
            {copy.palettePresetSource}
          </Button>
        ) : null}
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
      {showSwatchPreview && selectedId === "source" ? (
        <p className="text-sm text-secondary">{copy.palettePresetSource}</p>
      ) : null}
    </div>
  );
}
