import { PalettePresetGrid } from "@/components/palette/PalettePresetGrid";
import type { PalettePresetId } from "@/components/palette/palettePresetCatalog";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  importColorCountsForResolution,
  type ImportColorCount,
  type ImportPaletteMode,
} from "./paletteImportOptions";
import type { ResolutionPreset } from "./resolutionPresets";

type PaletteStepProps = {
  resolution: ResolutionPreset;
  mode: ImportPaletteMode;
  onModeChange: (mode: ImportPaletteMode) => void;
  presetId: PalettePresetId;
  onPresetChange: (id: PalettePresetId) => void;
  colorCount: ImportColorCount;
  onColorCountChange: (count: ImportColorCount) => void;
};

const MODE_OPTIONS: readonly { id: ImportPaletteMode; label: string; description: string }[] = [
  {
    id: "image",
    label: copy.importWizardPaletteModeImage,
    description: copy.importWizardPaletteModeImageHint,
  },
  {
    id: "style",
    label: copy.importWizardPaletteModeStyle,
    description: copy.importWizardPaletteModeStyleHint,
  },
];

export function PaletteStep({
  resolution,
  mode,
  onModeChange,
  presetId,
  onPresetChange,
  colorCount,
  onColorCountChange,
}: PaletteStepProps) {
  const colorCounts = importColorCountsForResolution(resolution);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-secondary">{copy.importWizardPaletteHint}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODE_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={mode === option.id ? "primary" : "secondary"}
            className={cn("flex h-auto min-h-20 flex-col items-start gap-1 px-4 py-3")}
            onClick={() => onModeChange(option.id)}
            aria-pressed={mode === option.id}
          >
            <span className="font-semibold">{option.label}</span>
            <span className="text-sm opacity-80">{option.description}</span>
          </Button>
        ))}
      </div>

      {mode === "image" ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm text-secondary">{copy.importWizardColorCountHint}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colorCounts.map((count) => {
              const meta = copy.importWizardColorCountOption(count);
              return (
                <Button
                  key={count}
                  type="button"
                  variant={colorCount === count ? "primary" : "secondary"}
                  className={cn("flex h-auto min-h-16 flex-col items-start gap-1 px-4 py-3")}
                  onClick={() => onColorCountChange(count)}
                  aria-pressed={colorCount === count}
                >
                  <span className="font-semibold">{meta.label}</span>
                  <span className="text-sm opacity-80">{meta.description}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm text-secondary">{copy.importWizardStylePresetHint}</p>
          <PalettePresetGrid
            selectedId={presetId}
            showSwatchPreview
            onSelect={(preset) => onPresetChange(preset.id)}
          />
        </div>
      )}
    </div>
  );
}
