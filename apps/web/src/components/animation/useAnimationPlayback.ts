import { fetchFrame } from "@/api/frames";
import { ensureFrameCached, writeFramePixels } from "@/state/frameCache";
import { useEditorStore } from "@/state/editorStore";
import { flushFrameSync } from "@/state/persist";
import { useCallback, useEffect, useRef } from "react";

/** Prefetch uncached frame buffers and fold the active buffer into the cache. */
export async function prefetchFrameCache(projectId: string): Promise<void> {
  const state = useEditorStore.getState();
  const cached = ensureFrameCached(state);
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
      nextCache = writeFramePixels(nextCache, index, result.pixels);
    }
  }

  useEditorStore.setState({ framePixelsByIndex: nextCache });
}

export function useAnimationPrefetch(projectId: string | null): () => Promise<void> {
  return useCallback(async () => {
    if (!projectId) {
      return;
    }
    await prefetchFrameCache(projectId);
  }, [projectId]);
}

export function usePlaybackLoop(
  isPlaying: boolean,
  fps: number,
  advancePlaybackFrame: () => boolean,
): void {
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const tick = useCallback(
    (timestamp: number) => {
      if (!useEditorStore.getState().isPlaying) {
        return;
      }

      const intervalMs = 1000 / useEditorStore.getState().animationFps;
      if (timestamp - lastTickRef.current >= intervalMs) {
        lastTickRef.current = timestamp;
        const advanced = advancePlaybackFrame();
        if (!advanced && !useEditorStore.getState().isPlaying) {
          return;
        }
        if (!advanced) {
          useEditorStore.getState().setPlaying(false);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [advancePlaybackFrame],
  );

  useEffect(() => {
    const cancelRaf = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (!isPlaying) {
      cancelRaf();
      return;
    }

    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return cancelRaf;
  }, [fps, isPlaying, tick]);
}

export async function startPlaybackWithPrefetch(
  frameCount: number,
  prefetch: () => Promise<void>,
): Promise<{ lastTick: number } | null> {
  if (frameCount <= 1) {
    return null;
  }

  const state = useEditorStore.getState();
  if (state.isDirty) {
    await flushFrameSync();
  }

  await prefetch();
  useEditorStore.getState().preparePlaybackStart();
  return { lastTick: performance.now() };
}
