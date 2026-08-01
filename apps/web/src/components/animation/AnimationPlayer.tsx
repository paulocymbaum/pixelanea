import { useCallback, useEffect, useRef } from "react";
import { fetchFrame, pixelsFromFrame } from "@/api/frames";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { useEditorStore } from "@/state/editorStore";
import { writeFramePixels } from "@/state/frameCache";
import { flushFrameSync } from "@/state/persist";
import { Pause, Play, Repeat } from "lucide-react";

type AnimationPlayerProps = {
  className?: string;
};

export function AnimationPlayer({ className }: AnimationPlayerProps) {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const fps = useEditorStore((s) => s.animationFps);
  const loop = useEditorStore((s) => s.animationLoop);
  const frameCount = useEditorStore((s) => s.frameCount);
  const projectId = useEditorStore((s) => s.projectId);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setAnimationFps = useEditorStore((s) => s.setAnimationFps);
  const setAnimationLoop = useEditorStore((s) => s.setAnimationLoop);
  const advancePlaybackFrame = useEditorStore((s) => s.advancePlaybackFrame);

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const prefetchFrames = useCallback(async () => {
    if (!projectId) {
      return;
    }

    const state = useEditorStore.getState();
    const cached = writeFramePixels(
      state.framePixelsByIndex,
      state.activeFrameIndex,
      state.pixels,
    );
    let nextCache = cached;

    const missing: number[] = [];
    for (let i = 0; i < state.frameCount; i++) {
      if (!nextCache[i]) {
        missing.push(i);
      }
    }

    if (missing.length === 0) {
      useEditorStore.setState({ framePixelsByIndex: nextCache });
      return;
    }

    const results = await Promise.all(
      missing.map(async (index) => {
        const result = await fetchFrame(projectId, index);
        return { index, result };
      }),
    );

    for (const { index, result } of results) {
      if (result.ok) {
        nextCache = writeFramePixels(
          nextCache,
          index,
          pixelsFromFrame(result.frame),
        );
      }
    }

    useEditorStore.setState({ framePixelsByIndex: nextCache });
  }, [projectId]);

  const stopPlayback = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlaying(false);
  }, [setPlaying]);

  const tick = useCallback(
    (timestamp: number) => {
      if (!useEditorStore.getState().isPlaying) {
        return;
      }

      const intervalMs = 1000 / useEditorStore.getState().animationFps;
      if (timestamp - lastTickRef.current >= intervalMs) {
        const advanced = advancePlaybackFrame();
        if (advanced) {
          lastTickRef.current = timestamp;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [advancePlaybackFrame],
  );

  const startPlayback = useCallback(async () => {
    if (frameCount <= 1) {
      return;
    }

    const state = useEditorStore.getState();
    if (state.isDirty) {
      await flushFrameSync();
    }

    await prefetchFrames();
    lastTickRef.current = performance.now();
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [frameCount, prefetchFrames, setPlaying, tick]);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    void startPlayback();
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    if (rafRef.current === null) {
      lastTickRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [fps, isPlaying, tick]);

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
        variant={loop ? "primary" : "secondary"}
        size="default"
        onClick={() => setAnimationLoop(!loop)}
        disabled={frameCount <= 1}
        aria-pressed={loop}
        aria-label={loop ? copy.animationLoopOn : copy.animationLoopOff}
        className="min-h-10"
      >
        <Repeat className="h-4 w-4" strokeWidth={1.5} />
        {copy.animationLoop}
      </Button>
    </div>
  );
}
