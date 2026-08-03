import type { StoreApi } from "zustand";
import {
  ensureFrameCached,
  writeFramePixels,
} from "@/state/frameCache";
import { scheduleProjectSettingsSync } from "@/state/persist";

const MIN_ANIMATION_FPS = 1;
const MAX_ANIMATION_FPS = 24;

function createEmptyPixels(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height);
}

export function clampAnimationFps(fps: number): number {
  return Math.max(
    MIN_ANIMATION_FPS,
    Math.min(MAX_ANIMATION_FPS, Math.round(fps)),
  );
}

type PlaybackSlice = {
  isPlaying: boolean;
  readOnly: boolean;
  frameCount: number;
  activeFrameIndex: number;
  animationLoop: boolean;
  animationBoomerang: boolean;
  playbackDirection: 1 | -1;
  animationFps: number;
  framePixelsByIndex: Record<number, Uint8Array>;
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  placingLighting: boolean;
  bundleDirty: boolean;
};

function framePixelsAt(
  cached: Record<number, Uint8Array>,
  index: number,
  gridWidth: number,
  gridHeight: number,
): { pixels: Uint8Array; cache: Record<number, Uint8Array> } {
  const existing = cached[index];
  if (existing) {
    return { pixels: existing, cache: cached };
  }

  const pixels = createEmptyPixels(gridWidth, gridHeight);
  return { pixels, cache: writeFramePixels(cached, index, pixels) };
}

export function createPlaybackActions(
  get: StoreApi<PlaybackSlice>["getState"],
  set: StoreApi<PlaybackSlice>["setState"],
) {
  return {
    setPlaying: (isPlaying: boolean) => {
      set({ isPlaying, readOnly: isPlaying, placingLighting: false });
    },

    setAnimationFps: (fps: number) => {
      set({ animationFps: clampAnimationFps(fps), bundleDirty: true });
      scheduleProjectSettingsSync();
    },

    setAnimationLoop: (animationLoop: boolean) => {
      set({ animationLoop, animationBoomerang: false, bundleDirty: true });
      scheduleProjectSettingsSync();
    },

    setAnimationBoomerang: (animationBoomerang: boolean) => {
      set({
        animationBoomerang,
        animationLoop: animationBoomerang ? true : get().animationLoop,
      });
    },

    /** Rewind to frame 0 when play-once would otherwise start on the last frame. */
    preparePlaybackStart: (): void => {
      const state = get();
      if (state.frameCount <= 1) {
        return;
      }

      if (state.animationLoop || state.animationBoomerang) {
        set({ playbackDirection: 1 });
        return;
      }

      if (state.activeFrameIndex < state.frameCount - 1) {
        set({ playbackDirection: 1 });
        return;
      }

      let cached = ensureFrameCached(state);
      let firstFrame = cached[0];
      if (!firstFrame) {
        firstFrame = createEmptyPixels(state.gridWidth, state.gridHeight);
        cached = writeFramePixels(cached, 0, firstFrame);
      }

      set({
        activeFrameIndex: 0,
        pixels: new Uint8Array(firstFrame),
        framePixelsByIndex: cached,
        playbackDirection: 1,
      });
    },

    advancePlaybackFrame: (): boolean => {
      const state = get();
      if (!state.isPlaying || state.frameCount <= 1) {
        return false;
      }

      const cached = ensureFrameCached(state);
      const lastIndex = state.frameCount - 1;

      if (state.animationBoomerang) {
        let direction = state.playbackDirection;
        let nextIndex = state.activeFrameIndex + direction;

        if (direction === 1 && state.activeFrameIndex >= lastIndex) {
          direction = -1;
          nextIndex = state.activeFrameIndex - 1;
        } else if (direction === -1 && state.activeFrameIndex <= 0) {
          direction = 1;
          nextIndex = state.activeFrameIndex + 1;
        }

        const resolved = framePixelsAt(
          cached,
          nextIndex,
          state.gridWidth,
          state.gridHeight,
        );

        set({
          playbackDirection: direction,
          activeFrameIndex: nextIndex,
          pixels: new Uint8Array(resolved.pixels),
          framePixelsByIndex: resolved.cache,
        });
        return true;
      }

      const nextIndex = state.activeFrameIndex + 1;
      if (nextIndex >= state.frameCount) {
        if (!state.animationLoop) {
          set({ isPlaying: false, readOnly: false, framePixelsByIndex: cached });
          return false;
        }
        const firstFrame = cached[0];
        if (!firstFrame) {
          return false;
        }
        set({
          activeFrameIndex: 0,
          pixels: new Uint8Array(firstFrame),
          framePixelsByIndex: cached,
          playbackDirection: 1,
        });
        return true;
      }

      const resolved = framePixelsAt(
        cached,
        nextIndex,
        state.gridWidth,
        state.gridHeight,
      );

      set({
        activeFrameIndex: nextIndex,
        pixels: new Uint8Array(resolved.pixels),
        framePixelsByIndex: resolved.cache,
        playbackDirection: 1,
      });
      return true;
    },
  };
}

export { createEmptyPixels };
