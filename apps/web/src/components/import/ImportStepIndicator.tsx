import { Check } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { IMPORT_WIZARD_STEPS, type ImportWizardStep } from "./types";

const STEP_LABELS: Record<ImportWizardStep, string> = {
  file: copy.importWizardStepFile,
  resolution: copy.importWizardStepResolution,
  palette: copy.importWizardStepPalette,
  preview: copy.importWizardStepPreview,
};

type ImportStepIndicatorProps = {
  currentStep: ImportWizardStep;
  onStepSelect: (step: ImportWizardStep) => void;
  className?: string;
};

export function ImportStepIndicator({
  currentStep,
  onStepSelect,
  className,
}: ImportStepIndicatorProps) {
  const currentIndex = IMPORT_WIZARD_STEPS.indexOf(currentStep);

  const focusTab = (step: ImportWizardStep) => {
    document.getElementById(`import-wizard-tab-${step}`)?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;

    for (
      let nextIndex = index + direction;
      nextIndex >= 0 && nextIndex < IMPORT_WIZARD_STEPS.length;
      nextIndex += direction
    ) {
      if (nextIndex <= currentIndex) {
        const nextStep = IMPORT_WIZARD_STEPS[nextIndex];
        if (nextStep) {
          onStepSelect(nextStep);
          focusTab(nextStep);
        }
        break;
      }
    }
  };

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="tablist"
      aria-label={copy.importWizardStepsLabel}
    >
      {IMPORT_WIZARD_STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        const isFuture = index > currentIndex;
        const label = STEP_LABELS[step];
        const tabLabel = isComplete ? copy.importWizardStepCompleted(label) : label;

        return (
          <Button
            key={step}
            id={`import-wizard-tab-${step}`}
            type="button"
            role="tab"
            variant={isActive ? "primary" : "secondary"}
            aria-selected={isActive}
            aria-controls={`import-wizard-panel-${step}`}
            aria-disabled={isFuture}
            disabled={isFuture}
            aria-label={isComplete ? tabLabel : undefined}
            className={cn(
              isComplete && !isActive && "text-secondary",
              isFuture && "text-secondary/70",
            )}
            onClick={() => {
              if (!isFuture) {
                onStepSelect(step);
              }
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {isComplete ? (
              <Check className="h-4 w-4 shrink-0" aria-hidden />
            ) : null}
            <span aria-hidden={isComplete}>{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
