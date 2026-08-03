import type { StoreApi } from "zustand";
import { ensureFrameCached, writeFramePixels } from "@/state/frameCache";
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
  animationFps: number;
  framePixelsByIndex: Record<number, Uint8Array>;
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  placingLighting: boolean;
  bundleDirty: boolean;
};

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
      set({ animationLoop, bundleDirty: true });
      scheduleProjectSettingsSync();
    },

    advancePlaybackFrame: (): boolean => {
      const state = get();
      if (!state.isPlaying || state.frameCount <= 1) {
        return false;
      }

      const cached = ensureFrameCached(state);
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
        });
        return true;
      }

      const nextPixels = cached[nextIndex];
      if (!nextPixels) {
        return false;
      }

      set({
        activeFrameIndex: nextIndex,
        pixels: new Uint8Array(nextPixels),
        framePixelsByIndex: cached,
      });
      return true;
    },
  };
}

export { createEmptyPixels };
