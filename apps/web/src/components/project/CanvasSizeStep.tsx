import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  RESOLUTION_PRESETS,
  type ResolutionPreset,
} from "@/components/import/resolutionPresets";
import {
  formatCanvasSize,
  isPresetCanvasSize,
  matchesResolutionPreset,
  type CanvasSize,
} from "./canvasSize";
import { CustomCanvasSizeDialog } from "./CustomCanvasSizeDialog";

type CanvasSizeStepProps = {
  value: CanvasSize;
  onChange: (value: CanvasSize) => void;
};

export function CanvasSizeStep({ value, onChange }: CanvasSizeStepProps) {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const customSelected = !isPresetCanvasSize(value);

  const selectPreset = (preset: ResolutionPreset) => {
    onChange({ width: preset, height: preset });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-secondary">{copy.newProjectCanvasSizeHint}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RESOLUTION_PRESETS.map((option) => (
          <Button
            key={option.size}
            type="button"
            variant={
              matchesResolutionPreset(value, option.size) ? "primary" : "secondary"
            }
            className={cn(
              "flex h-auto min-h-20 flex-col items-start gap-1 px-4 py-3",
            )}
            onClick={() => selectPreset(option.size)}
            aria-pressed={matchesResolutionPreset(value, option.size)}
          >
            <span className="font-semibold">{option.label}</span>
            <span className="text-sm opacity-80">{option.description}</span>
          </Button>
        ))}

        <Button
          type="button"
          variant={customSelected ? "primary" : "secondary"}
          className={cn(
            "flex h-auto min-h-20 flex-col items-start gap-1 px-4 py-3",
          )}
          onClick={() => setCustomDialogOpen(true)}
          aria-pressed={customSelected}
        >
          <span className="font-semibold">{copy.customCanvasSizeLabel}</span>
          <span className="text-sm opacity-80">
            {customSelected
              ? formatCanvasSize(value)
              : copy.customCanvasSizeDescription}
          </span>
        </Button>
      </div>

      <CustomCanvasSizeDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        initialSize={value}
        onConfirm={onChange}
      />
    </div>
  );
}
