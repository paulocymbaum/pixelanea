import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/state/uiStore";

const STEPS = [
  {
    title: copy.onboardingStepPickColorTitle,
    body: copy.onboardingStepPickColorBody,
    position: "right-4 top-24 max-w-xs",
  },
  {
    title: copy.onboardingStepPaintTitle,
    body: copy.onboardingStepPaintBody,
    position: "left-1/2 top-1/2 max-w-sm -translate-x-1/2",
  },
  {
    title: copy.onboardingStepSaveTitle,
    body: copy.onboardingStepSaveBody,
    position: "left-4 top-16 max-w-xs",
  },
] as const;

type SkippableOverlayProps = {
  className?: string;
};

export function SkippableOverlay({ className }: SkippableOverlayProps) {
  const step = useUiStore((s) => s.onboardingStep);
  const setStep = useUiStore((s) => s.setOnboardingStep);
  const setDismissed = useUiStore((s) => s.setOnboardingDismissed);

  const current = STEPS[step];
  if (!current) {
    return null;
  }

  const isLast = step >= STEPS.length - 1;

  const dismiss = () => setDismissed(true);

  const advance = () => {
    if (isLast) {
      dismiss();
      return;
    }
    setStep(step + 1);
  };

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-50", className)}
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto absolute rounded-panel border border-border bg-elevated p-4 shadow-lg",
          current.position,
        )}
        role="dialog"
        aria-labelledby="onboarding-title"
      >
        <h2 id="onboarding-title" className="text-base font-semibold text-primary">
          {current.title}
        </h2>
        <p className="mt-2 text-sm text-secondary">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="default" onClick={dismiss}>
            {copy.onboardingSkip}
          </Button>
          <Button type="button" variant="primary" size="default" onClick={advance}>
            {isLast ? copy.onboardingDone : copy.onboardingNext}
          </Button>
        </div>
      </div>
    </div>
  );
}
