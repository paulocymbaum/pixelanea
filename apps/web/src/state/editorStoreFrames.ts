import type { StoreApi } from "zustand";
import { fetchFrame } from "@/api/frames";
import { logger } from "@/logging/logger";
import {
  ensureFrameCached,
  resolveAllFramePixels,
  writeFramePixels,
} from "@/state/frameCache";
import { flushFrameSync } from "@/state/persist";
import {
  activeIndexAfterReorder,
  reorderFramePixels,
} from "@/state/frameReorder";
import { withFrameSyncStatus } from "@/state/editorStoreSync";
import { createEmptyPixels } from "@/state/editorStorePlayback";

type FrameSlice = {
  projectId: string | null;
  activeFrameIndex: number;
  frameCount: number;
  gridWidth: number;
  gridHeight: number;
  pixels: Uint8Array;
  framePixelsByIndex: Record<number, Uint8Array>;
  isPlaying: boolean;
  isDirty: boolean;
  frameSyncStatus: import("./editorStoreSync").SyncStatus;
  paletteSyncStatus: import("./editorStoreSync").SyncStatus;
  frameSyncError: string | null;
  paletteSyncError: string | null;
  undoStack: import("@/state/commands/types").Command[];
  redoStack: import("@/state/commands/types").Command[];
  setFrameSyncStatus: (status: import("./editorStoreSync").SyncStatus, error?: string | null) => void;
};

export function createFrameActions(
  get: StoreApi<FrameSlice>["getState"],
  set: StoreApi<FrameSlice>["setState"],
) {
  return {
    switchFrame: async (index: number) => {
      const state = get();
      if (
        index < 0 ||
        index >= state.frameCount ||
        index === state.activeFrameIndex ||
        state.isPlaying
      ) {
        return;
      }

      set({ framePixelsByIndex: ensureFrameCached(state) });

      if (state.isDirty) {
        await flushFrameSync();
      }

      const flushed = get();
      let cachedCurrent = ensureFrameCached(flushed);

      let nextPixels = cachedCurrent[index];
      if (!nextPixels && flushed.projectId) {
        const result = await fetchFrame(flushed.projectId, index);
        if (!result.ok) {
          logger.error("editorStore", "switch_frame_fetch_failed", {
            projectId: flushed.projectId,
            frameIndex: index,
            message: result.message,
          });
          get().setFrameSyncStatus("error", result.message);
          return;
        }
        nextPixels = result.pixels;
        cachedCurrent = ensureFrameCached(get());
      }

      if (!nextPixels) {
        nextPixels = createEmptyPixels(flushed.gridWidth, flushed.gridHeight);
      }

      set({
        activeFrameIndex: index,
        pixels: new Uint8Array(nextPixels),
        framePixelsByIndex: writeFramePixels(cachedCurrent, index, nextPixels),
        undoStack: [],
        redoStack: [],
        isDirty: false,
        frameSyncStatus: "idle",
        paletteSyncStatus: "idle",
        frameSyncError: null,
        paletteSyncError: null,
      });
    },

    reloadAllFrames: async (
      frameCount: number,
      activeIndex = 0,
    ): Promise<{ ok: true } | { ok: false }> => {
      const state = get();
      if (!state.projectId) {
        return { ok: false };
      }

      if (state.isDirty) {
        await flushFrameSync();
      }

      const clampedActive = Math.max(0, Math.min(activeIndex, frameCount - 1));
      const result = await resolveAllFramePixels({
        projectId: state.projectId,
        frameCount,
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        activeFrameIndex: state.activeFrameIndex,
        activePixels: state.pixels,
        framePixelsByIndex: state.framePixelsByIndex,
      });

      if (!result.ok) {
        logger.error("editorStore", "reload_all_frames_failed", {
          projectId: state.projectId,
          frameCount,
          message: result.message,
        });
        get().setFrameSyncStatus("error", result.message);
        return { ok: false };
      }

      const pixels = result.frames[clampedActive];

      set({
        frameCount,
        activeFrameIndex: clampedActive,
        framePixelsByIndex: result.framePixelsByIndex,
        pixels: new Uint8Array(pixels),
        undoStack: [],
        redoStack: [],
        isDirty: false,
        frameSyncStatus: "idle",
        paletteSyncStatus: "idle",
        frameSyncError: null,
        paletteSyncError: null,
      });

      return { ok: true };
    },

    applyFrameReorder: (fromIndex: number, toIndex: number): number => {
      const state = get();
      const activeFrameIndex = activeIndexAfterReorder(
        state.activeFrameIndex,
        fromIndex,
        toIndex,
      );

      set({
        activeFrameIndex,
        framePixelsByIndex: reorderFramePixels(
          ensureFrameCached(state),
          fromIndex,
          toIndex,
        ),
      });

      return activeFrameIndex;
    },

    applyFramePixelsAtIndex: (index: number, pixels: Uint8Array) => {
      const state = get();
      const framePixelsByIndex = writeFramePixels(
        state.framePixelsByIndex,
        index,
        pixels,
      );

      if (index === state.activeFrameIndex) {
        set({
          framePixelsByIndex,
          pixels: new Uint8Array(pixels),
          undoStack: [],
          redoStack: [],
          isDirty: false,
          frameSyncStatus: "idle",
          paletteSyncStatus: "idle",
          frameSyncError: null,
          paletteSyncError: null,
        });
        return;
      }

      set({ framePixelsByIndex });
    },
  };
}

export function createFrameSyncActions(
  _get: StoreApi<FrameSlice>["getState"],
  set: StoreApi<FrameSlice>["setState"],
) {
  return {
    markFrameSynced: () =>
      set({
        isDirty: false,
        frameSyncStatus: "idle",
        frameSyncError: null,
      }),

    setFrameSyncStatus: (
      status: import("./editorStoreSync").SyncStatus,
      error?: string | null,
    ) => set((state) => withFrameSyncStatus(state, status, error ?? null)),
  };
}
