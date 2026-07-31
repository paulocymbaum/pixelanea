import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import {
  ANIMATION_FRAME_PRESETS,
  SINGLE_FRAME_COUNT,
  type AnimationFramePreset,
} from "./animationFramePresets";

type AnimationFrameCountStepProps = {
  value: AnimationFramePreset;
  onChange: (value: AnimationFramePreset) => void;
};

export function AnimationFrameCountStep({
  value,
  onChange,
}: AnimationFrameCountStepProps) {
  const isAnimated = value > SINGLE_FRAME_COUNT;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-secondary">{copy.newProjectAnimationLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={!isAnimated ? "primary" : "secondary"}
          className="flex h-auto min-h-20 flex-col items-start gap-1 px-4 py-3"
          onClick={() => onChange(SINGLE_FRAME_COUNT)}
          aria-pressed={!isAnimated}
        >
          <span className="font-semibold">{copy.newProjectAnimationOff}</span>
          <span className="text-sm opacity-80">
            {copy.newProjectAnimationOffDescription}
          </span>
        </Button>
        <Button
          type="button"
          variant={isAnimated ? "primary" : "secondary"}
          className="flex h-auto min-h-20 flex-col items-start gap-1 px-4 py-3"
          onClick={() =>
            onChange(
              value > SINGLE_FRAME_COUNT ? value : ANIMATION_FRAME_PRESETS[0],
            )
          }
          aria-pressed={isAnimated}
        >
          <span className="font-semibold">{copy.newProjectAnimationOn}</span>
          <span className="text-sm opacity-80">
            {copy.newProjectAnimationOnDescription}
          </span>
        </Button>
      </div>

      {isAnimated ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {ANIMATION_FRAME_PRESETS.map((count) => (
            <Button
              key={count}
              type="button"
              variant={value === count ? "primary" : "secondary"}
              className="min-h-12"
              onClick={() => onChange(count)}
              aria-pressed={value === count}
            >
              {copy.newProjectAnimationFrames(count)}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
