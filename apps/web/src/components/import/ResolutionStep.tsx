import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  RESOLUTION_PRESETS,
  type ResolutionPreset,
} from "./resolutionPresets";

type ResolutionStepProps = {
  value: ResolutionPreset;
  onChange: (value: ResolutionPreset) => void;
  removeBackground: boolean;
  onRemoveBackgroundChange: (value: boolean) => void;
};

export function ResolutionStep({
  value,
  onChange,
  removeBackground,
  onRemoveBackgroundChange,
}: ResolutionStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-secondary">{copy.importWizardResolutionHint}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {RESOLUTION_PRESETS.map((option) => (
          <Button
            key={option.size}
            type="button"
            variant={value === option.size ? "primary" : "secondary"}
            className={cn(
              "flex h-auto min-h-20 flex-col items-start gap-1 px-4 py-3",
            )}
            onClick={() => onChange(option.size)}
            aria-pressed={value === option.size}
          >
            <span className="font-semibold">{option.label}</span>
            <span className="text-sm opacity-80">{option.description}</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm text-secondary">
          {copy.importWizardRemoveBackgroundHint}
        </p>
        <Button
          type="button"
          variant={removeBackground ? "primary" : "secondary"}
          className="min-h-10 self-start"
          onClick={() => onRemoveBackgroundChange(!removeBackground)}
          aria-pressed={removeBackground}
          aria-label={
            removeBackground
              ? copy.importWizardRemoveBackgroundOn
              : copy.importWizardRemoveBackgroundOff
          }
        >
          {copy.importWizardRemoveBackground}
        </Button>
      </div>
    </div>
  );
}
