import { vi, type Mock } from "vitest";
import type { Frame, FrameMetadata, Project } from "@pixelanea/api-client";
import type { SaveResult } from "@/state/sync/types";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import { useEditorStore } from "@/state/editorStore";
import {
  resetEditor,
  withFrames,
  withFrameSyncMock,
} from "@/qa/editorFixtures";

export const MATRIX_PROJECT_ID = "animation-matrix-project";
export const GRID_SIZE = 8;

type EditorState = ReturnType<typeof useEditorStore.getState>;

/** Frame buffer tagged at cell (0,0) so tests can identify which frame they hold. */
export function framePixels(marker: number, size = GRID_SIZE): Uint8Array {
  const pixels = new Uint8Array(size * size);
  pixels[0] = marker;
  return pixels;
}

export function buildFrameCache(
  count: number,
  options: { identical?: boolean; size?: number } = {},
): Record<number, Uint8Array> {
  const size = options.size ?? GRID_SIZE;
  const cache: Record<number, Uint8Array> = {};
  for (let index = 0; index < count; index++) {
    cache[index] = framePixels(options.identical ? 1 : index + 1, size);
  }
  return cache;
}

export function resetAnimationProject(
  overrides: Partial<EditorState> = {},
): void {
  const frameCount = overrides.frameCount ?? 1;
  const gridWidth = overrides.gridWidth ?? GRID_SIZE;
  const preset = withFrames(frameCount, {
    gridSize: gridWidth,
    projectId: MATRIX_PROJECT_ID,
    framePixelsByIndex: overrides.framePixelsByIndex,
  });

  const merged = {
    ...preset,
    projectName: "Animation matrix",
    ...overrides,
  };
  const cache = merged.framePixelsByIndex as Record<number, Uint8Array>;
  const activeFrameIndex = merged.activeFrameIndex ?? 0;
  const pixels =
    overrides.pixels ??
    new Uint8Array(
      cache[activeFrameIndex] ?? new Uint8Array(gridWidth * gridWidth),
    );

  resetEditor({
    ...merged,
    activeFrameIndex,
    pixels,
    framePixelsByIndex: { ...cache },
  });
}

export function frameMetadata(index: number, size = GRID_SIZE): FrameMetadata {
  return {
    index,
    width: size,
    height: size,
    updatedAt: "2026-07-31T00:00:00Z",
  };
}

export function frameResponse(
  index: number,
  pixels: Uint8Array,
  size = GRID_SIZE,
): Frame {
  return { ...frameMetadata(index, size), pixels: Array.from(pixels) };
}

export function projectResponse(frameCount: number, size = GRID_SIZE): Project {
  return {
    id: MATRIX_PROJECT_ID,
    name: "Animation matrix",
    width: size,
    height: size,
    frameCount,
    fps: 8,
    loop: true,
    cellSize: 1,
    assetType: "animation",
    createdAt: "2026-07-31T00:00:00Z",
    updatedAt: "2026-07-31T00:00:00Z",
  };
}

export function duplicateResponse(frameCount: number, size = GRID_SIZE) {
  return {
    project: projectResponse(frameCount, size),
    frames: Array.from({ length: frameCount }, (_, i) => frameMetadata(i, size)),
  };
}

export function reorderResponse(frameCount: number, size = GRID_SIZE) {
  return {
    frames: Array.from({ length: frameCount }, (_, i) => frameMetadata(i, size)),
  };
}

/** Install a SyncCoordinator whose saveFrame is observable and (optionally) failing/slow. */
export function installFrameCoordinator(
  saveFrame: (
    projectId: string,
    frameIndex: number,
    pixels: Uint8Array,
  ) => Promise<SaveResult> = async () => ({ ok: true }),
  debounceMs = 0,
): Mock {
  return withFrameSyncMock(saveFrame, debounceMs);
}

export function activePixelAt(x: number, y: number): number {
  const state = useEditorStore.getState();
  return state.pixels[y * state.gridWidth + x] ?? 0;
}

export function cachedPixelAt(frameIndex: number, x: number, y: number): number {
  const state = useEditorStore.getState();
  const frame = state.framePixelsByIndex[frameIndex];
  return frame?.[y * state.gridWidth + x] ?? 0;
}

/** Marker written by {@link framePixels}; identifies the frame a buffer came from. */
export function cachedMarker(frameIndex: number): number {
  return cachedPixelAt(frameIndex, 0, 0);
}

export function paintActiveFrame(x: number, y: number, colorIndex: number): void {
  const previous = activePixelAt(x, y);
  useEditorStore
    .getState()
    .dispatch(
      new PaintCellsCommand([{ x, y, previous, next: colorIndex }]),
    );
}

/** Minimal DataTransfer stand-in; jsdom does not implement drag-and-drop. */
export function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  return {
    effectAllowed: "none",
    dropEffect: "none",
    setData: (format: string, value: string) => {
      store.set(format, String(value));
    },
    getData: (format: string) => store.get(format) ?? "",
    setDragImage: () => undefined,
  } as unknown as DataTransfer;
}

/** jsdom reports zero layout; Canvas bails out of redraw unless the box has size. */
export function stubElementBox(size = 320): () => void {
  const descriptors = ["clientWidth", "clientHeight"] as const;
  const originals = descriptors.map((key) =>
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, key),
  );

  for (const key of descriptors) {
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get: () => size,
    });
  }

  return () => {
    descriptors.forEach((key, i) => {
      const original = originals[i];
      if (original) {
        Object.defineProperty(HTMLElement.prototype, key, original);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
      }
    });
  };
}