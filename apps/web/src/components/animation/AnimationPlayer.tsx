import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { copy } from "@/content/copy";
import { features } from "@/content/features";
import { cn } from "@/lib/cn";
import {
  useEditorStore,
  useOnionSkinEnabled,
  useOnionSkinOpacity,
} from "@/state/editorStore";
import {
  startPlaybackWithPrefetch,
  useAnimationPrefetch,
  usePlaybackLoop,
} from "@/components/animation/useAnimationPlayback";
import { ArrowLeftRight, Layers, Pause, Play, Repeat } from "lucide-react";

type AnimationPlayerProps = {
  className?: string;
};

export function AnimationPlayer({ className }: AnimationPlayerProps) {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const fps = useEditorStore((s) => s.animationFps);
  const loop = useEditorStore((s) => s.animationLoop);
  const boomerang = useEditorStore((s) => s.animationBoomerang);
  const frameCount = useEditorStore((s) => s.frameCount);
  const projectId = useEditorStore((s) => s.projectId);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setAnimationFps = useEditorStore((s) => s.setAnimationFps);
  const setAnimationLoop = useEditorStore((s) => s.setAnimationLoop);
  const setAnimationBoomerang = useEditorStore((s) => s.setAnimationBoomerang);
  const advancePlaybackFrame = useEditorStore((s) => s.advancePlaybackFrame);
  const onionSkinEnabled = useOnionSkinEnabled();
  const onionSkinOpacity = useOnionSkinOpacity();
  const setOnionSkinEnabled = useEditorStore((s) => s.setOnionSkinEnabled);
  const setOnionSkinOpacity = useEditorStore((s) => s.setOnionSkinOpacity);
  const onionOpacityPercent = Math.round(onionSkinOpacity * 100);

  const prefetchFrames = useAnimationPrefetch(projectId);

  usePlaybackLoop(isPlaying, fps, advancePlaybackFrame);

  const stopPlayback = useCallback(() => {
    setPlaying(false);
  }, [setPlaying]);

  const startPlayback = useCallback(async () => {
    const tick = await startPlaybackWithPrefetch(frameCount, prefetchFrames);
    if (!tick) {
      return;
    }
    setPlaying(true);
  }, [frameCount, prefetchFrames, setPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    void startPlayback();
  };

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      aria-label="Animation player"
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={togglePlay}
        disabled={frameCount <= 1}
        aria-label={isPlaying ? copy.animationPause : copy.animationPlay}
        className="min-h-10 min-w-10"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" strokeWidth={1.5} />
        ) : (
          <Play className="h-5 w-5" strokeWidth={1.5} />
        )}
      </Button>

      <div className="flex min-w-[140px] items-center gap-2">
        <Slider
          value={[fps]}
          min={1}
          max={24}
          step={1}
          onValueChange={([value]) => {
            if (value !== undefined) {
              setAnimationFps(value);
            }
          }}
          disabled={frameCount <= 1}
          aria-label={copy.animationFps}
        />
        <span className="w-12 shrink-0 text-sm text-secondary">
          {copy.animationFpsValue(fps)}
        </span>
      </div>

      <Button
        type="button"
        variant={loop && !boomerang ? "primary" : "secondary"}
        size="default"
        onClick={() => setAnimationLoop(!loop)}
        disabled={frameCount <= 1}
        aria-pressed={loop && !boomerang}
        aria-label={loop ? copy.animationLoopOn : copy.animationLoopOff}
        className="min-h-10"
      >
        <Repeat className="h-4 w-4" strokeWidth={1.5} />
        {copy.animationLoop}
      </Button>

      <Button
        type="button"
        variant={boomerang ? "primary" : "secondary"}
        size="default"
        onClick={() => setAnimationBoomerang(!boomerang)}
        disabled={frameCount <= 1}
        aria-pressed={boomerang}
        aria-label={
          boomerang ? copy.animationBoomerangOn : copy.animationBoomerangOff
        }
        className="min-h-10"
      >
        <ArrowLeftRight className="h-4 w-4" strokeWidth={1.5} />
        {copy.animationBoomerang}
      </Button>

      {features.onionSkin ? (
        <>
          <Button
            type="button"
            variant={onionSkinEnabled ? "primary" : "secondary"}
            size="default"
            onClick={() => setOnionSkinEnabled(!onionSkinEnabled)}
            disabled={frameCount <= 1}
            aria-pressed={onionSkinEnabled}
            aria-label={
              onionSkinEnabled
                ? copy.animationOnionSkinOn
                : copy.animationOnionSkinOff
            }
            className="min-h-10"
          >
            <Layers className="h-4 w-4" strokeWidth={1.5} />
            {copy.animationOnionSkin}
          </Button>

          {onionSkinEnabled ? (
            <div className="flex min-w-[120px] items-center gap-2">
              <Slider
                value={[onionOpacityPercent]}
                min={10}
                max={100}
                step={5}
                onValueChange={([value]) => {
                  if (value !== undefined) {
                    setOnionSkinOpacity(value / 100);
                  }
                }}
                disabled={frameCount <= 1}
                aria-label={copy.animationOnionSkinOpacity}
              />
              <span className="w-10 shrink-0 text-sm text-secondary">
                {copy.animationOnionSkinOpacityValue(onionOpacityPercent)}
              </span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
