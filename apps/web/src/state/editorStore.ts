import { create } from "zustand";
import type { CellCoord, Size, Viewport } from "@/canvas/coordinates";
import {
  fitToView as computeFitToView,
  zoomIn as computeZoomIn,
  zoomOut as computeZoomOut,
  clampZoom,
} from "@/canvas/coordinates";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import type { ToolId } from "@/content/tools";
import type { AssetType } from "@pixelanea/api-client";
import { DEFAULT_ASSET_TYPE } from "@/content/assetTypes";
import type { Command } from "@/state/commands/types";
import { pushCommands } from "@/state/commands/undoStack";
import {
  PALETTE_MAX_COLORS,
  PALETTE_MIN_COLORS,
  normalizeHex,
  remapPixelsAfterRemove,
} from "@/state/paletteUtils";
import {
  flushFrameSync,
  flushPaletteSync,
  scheduleFrameSync,
  schedulePaletteSync,
} from "@/state/persist";
import { fetchFrame, pixelsFromFrame } from "@/api/frames";
import { logger } from "@/logging/logger";
import { resolveAllFramePixels, writeFramePixels } from "@/state/frameCache";
import {
  computeFilterCellChanges,
  DEFAULT_COLOR_FILTER_SETTINGS,
  type ColorFilterSettings,
  type LightingPoint,
} from "@/lib/colorFilters";
import { PaintCellsCommand } from "@/state/commands/paintCells";

const DEFAULT_GRID_SIZE = 32;
const DEFAULT_ANIMATION_FPS = 8;
const MIN_ANIMATION_FPS = 1;
const MAX_ANIMATION_FPS = 24;

function createEmptyPixels(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height);
}

export type SyncStatus = "idle" | "syncing" | "error";

function reconcileDerivedSync(
  frameSyncStatus: SyncStatus,
  paletteSyncStatus: SyncStatus,
  frameSyncError: string | null,
  paletteSyncError: string | null,
): { syncStatus: SyncStatus; syncError: string | null } {
  const syncStatus: SyncStatus =
    frameSyncStatus === "error" || paletteSyncStatus === "error"
      ? "error"
      : frameSyncStatus === "syncing" || paletteSyncStatus === "syncing"
        ? "syncing"
        : "idle";
  const syncError = frameSyncError ?? paletteSyncError;
  return { syncStatus, syncError };
}

type EditorState = {
  projectId: string | null;
  activeTool: ToolId;
  activeColorIndex: number;
  activeFrameIndex: number;
  frameCount: number;
  projectName: string;
  gridWidth: number;
  gridHeight: number;
  pixels: Uint8Array;
  paletteColors: readonly string[];
  zoom: number;
  panX: number;
  panY: number;
  hoverCell: CellCoord | null;
  containerSize: Size;
  readOnly: boolean;
  paletteLocked: boolean;
  framePixelsByIndex: Record<number, Uint8Array>;
  isPlaying: boolean;
  animationFps: number;
  animationLoop: boolean;
  onionSkinEnabled: boolean;
  colorFilters: ColorFilterSettings;
  placingLighting: boolean;
  undoStack: Command[];
  redoStack: Command[];
  isDirty: boolean;
  isPaletteDirty: boolean;
  frameSyncStatus: SyncStatus;
  paletteSyncStatus: SyncStatus;
  syncStatus: SyncStatus;
  frameSyncError: string | null;
  paletteSyncError: string | null;
  syncError: string | null;
  bundlePath: string | null;
  assetType: AssetType;
  setProject: (params: {
    projectId: string;
    name: string;
    gridWidth: number;
    gridHeight: number;
    frameCount: number;
    pixels: Uint8Array;
    paletteColors: readonly string[];
    bundlePath?: string | null;
    assetType?: AssetType;
  }) => void;
  setActiveTool: (tool: ToolId) => void;
  setActiveColorIndex: (index: number) => void;
  setFrameCount: (count: number) => void;
  setReadOnly: (readOnly: boolean) => void;
  setPaletteLocked: (locked: boolean) => void;
  applyPalettePreset: (colors: readonly string[]) => void;
  switchFrame: (index: number) => Promise<void>;
  setPlaying: (playing: boolean) => void;
  setAnimationFps: (fps: number) => void;
  setAnimationLoop: (loop: boolean) => void;
  setOnionSkinEnabled: (enabled: boolean) => void;
  setColorFilterOverlayEnabled: (enabled: boolean) => void;
  setColorFilterOverlayColor: (color: string) => void;
  setColorFilterOverlayOpacity: (opacity: number) => void;
  addColorFilterLightingPoint: (point: Omit<LightingPoint, "id">) => void;
  removeColorFilterLightingPoint: (id: string) => void;
  updateColorFilterLightingPoint: (
    id: string,
    patch: Partial<Omit<LightingPoint, "id">>,
  ) => void;
  setPlacingLighting: (placing: boolean) => void;
  resetColorFilters: () => void;
  applyColorFilters: () => void;
  advancePlaybackFrame: () => boolean;
  setHoverCell: (cell: CellCoord | null) => void;
  setContainerSize: (size: Size) => void;
  setViewport: (viewport: Viewport) => void;
  setZoom: (zoom: number) => void;
  zoomIn: (anchor?: { x: number; y: number }) => void;
  zoomOut: (anchor?: { x: number; y: number }) => void;
  fitToView: (size?: Size) => void;
  dispatch: (command: Command | Command[]) => void;
  undo: () => void;
  redo: () => void;
  addPaletteColor: (hex: string) => void;
  updatePaletteColor: (index: number, hex: string) => void;
  removePaletteColor: (index: number) => void;
  savePalette: () => void;
  markFrameSynced: () => void;
  markPaletteSynced: () => void;
  setFrameSyncStatus: (status: SyncStatus, error?: string | null) => void;
  setPaletteSyncStatus: (status: SyncStatus, error?: string | null) => void;
  setBundlePath: (path: string | null) => void;
  setAssetType: (assetType: AssetType) => void;
  reloadAllFrames: (
    frameCount: number,
    activeIndex?: number,
  ) => Promise<{ ok: true } | { ok: false }>;
  applyFramePixelsAtIndex: (index: number, pixels: Uint8Array) => void;
};

function applyCommands(
  pixels: Uint8Array,
  gridWidth: number,
  commands: Command[],
  direction: "apply" | "revert",
): void {
  for (const command of commands) {
    if (direction === "apply") {
      command.apply(pixels, gridWidth);
    } else {
      command.revert(pixels, gridWidth);
    }
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  activeTool: "paint",
  activeColorIndex: 1,
  activeFrameIndex: 0,
  frameCount: 1,
  projectName: "Untitled project",
  gridWidth: DEFAULT_GRID_SIZE,
  gridHeight: DEFAULT_GRID_SIZE,
  pixels: createEmptyPixels(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE),
  paletteColors: DEFAULT_PALETTE_COLORS,
  zoom: 1,
  panX: 0,
  panY: 0,
  hoverCell: null,
  containerSize: { width: 0, height: 0 },
  readOnly: false,
  paletteLocked: false,
  framePixelsByIndex: {},
  isPlaying: false,
  animationFps: DEFAULT_ANIMATION_FPS,
  animationLoop: true,
  onionSkinEnabled: true,
  colorFilters: { ...DEFAULT_COLOR_FILTER_SETTINGS },
  placingLighting: false,
  undoStack: [],
  redoStack: [],
  isDirty: false,
  isPaletteDirty: false,
  frameSyncStatus: "idle",
  paletteSyncStatus: "idle",
  syncStatus: "idle",
  frameSyncError: null,
  paletteSyncError: null,
  syncError: null,
  bundlePath: null,
  assetType: DEFAULT_ASSET_TYPE,

  setProject: ({
    projectId,
    name,
    gridWidth,
    gridHeight,
    frameCount,
    pixels,
    paletteColors,
    bundlePath = null,
    assetType = DEFAULT_ASSET_TYPE,
  }) =>
    set({
      projectId,
      projectName: name,
      gridWidth,
      gridHeight,
      frameCount,
      pixels,
      paletteColors,
      bundlePath,
      assetType,
      framePixelsByIndex: writeFramePixels({}, 0, pixels),
      activeFrameIndex: 0,
      undoStack: [],
      redoStack: [],
      isDirty: false,
      isPaletteDirty: false,
      frameSyncStatus: "idle",
      paletteSyncStatus: "idle",
      syncStatus: "idle",
      frameSyncError: null,
      paletteSyncError: null,
      syncError: null,
      isPlaying: false,
      readOnly: false,
      colorFilters: { ...DEFAULT_COLOR_FILTER_SETTINGS },
      placingLighting: false,
    }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveColorIndex: (index) => {
    const { paletteColors } = get();
    const clamped = Math.max(0, Math.min(index, paletteColors.length - 1));
    set({ activeColorIndex: clamped });
  },
  setFrameCount: (count) => set({ frameCount: count }),
  setReadOnly: (readOnly) =>
    set((state) => ({
      readOnly,
      placingLighting: readOnly ? false : state.placingLighting,
    })),
  setPaletteLocked: (paletteLocked) => set({ paletteLocked }),

  applyPalettePreset: (colors) => {
    if (colors.length === 0) {
      return;
    }

    const state = get();
    if (state.paletteLocked) {
      return;
    }

    const paletteColors = colors.map((hex) => normalizeHex(hex) ?? hex);
    const activeColorIndex = Math.min(
      state.activeColorIndex,
      paletteColors.length - 1,
    );

    set({
      paletteColors,
      activeColorIndex,
      isPaletteDirty: true,
      paletteSyncStatus: "idle",
      paletteSyncError: null,
      ...reconcileDerivedSync(
        state.frameSyncStatus,
        "idle",
        state.frameSyncError,
        null,
      ),
    });
    schedulePaletteSync();
  },

  switchFrame: async (index) => {
    const state = get();
    if (
      index < 0 ||
      index >= state.frameCount ||
      index === state.activeFrameIndex ||
      state.isPlaying
    ) {
      return;
    }

    const cachedCurrent = writeFramePixels(
      state.framePixelsByIndex,
      state.activeFrameIndex,
      state.pixels,
    );

    set({ framePixelsByIndex: cachedCurrent });

    if (state.isDirty) {
      await flushFrameSync();
    }

    let nextPixels = cachedCurrent[index];
    if (!nextPixels && state.projectId) {
      const result = await fetchFrame(state.projectId, index);
      if (!result.ok) {
        logger.error("editorStore", "switch_frame_fetch_failed", {
          projectId: state.projectId,
          frameIndex: index,
          message: result.message,
        });
        get().setFrameSyncStatus("error", result.message);
        return;
      }
      nextPixels = pixelsFromFrame(result.frame);
    }

    if (!nextPixels) {
      nextPixels = createEmptyPixels(state.gridWidth, state.gridHeight);
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
      ...reconcileDerivedSync("idle", "idle", null, null),
    });
  },

  setPlaying: (isPlaying) => {
    set({ isPlaying, readOnly: isPlaying, placingLighting: false });
  },

  setAnimationFps: (fps) =>
    set({
      animationFps: Math.max(
        MIN_ANIMATION_FPS,
        Math.min(MAX_ANIMATION_FPS, Math.round(fps)),
      ),
    }),

  setAnimationLoop: (animationLoop) => set({ animationLoop }),

  setOnionSkinEnabled: (onionSkinEnabled) => set({ onionSkinEnabled }),

  setColorFilterOverlayEnabled: (overlayEnabled) =>
    set((state) => ({
      colorFilters: { ...state.colorFilters, overlayEnabled },
    })),

  setColorFilterOverlayColor: (overlayColor) =>
    set((state) => ({
      colorFilters: { ...state.colorFilters, overlayColor },
    })),

  setColorFilterOverlayOpacity: (overlayOpacity) =>
    set((state) => ({
      colorFilters: {
        ...state.colorFilters,
        overlayOpacity: Math.max(0, Math.min(1, overlayOpacity)),
      },
    })),

  addColorFilterLightingPoint: (point) =>
    set((state) => ({
      colorFilters: {
        ...state.colorFilters,
        lightingPoints: [
          ...state.colorFilters.lightingPoints,
          { ...point, id: crypto.randomUUID() },
        ],
      },
    })),

  removeColorFilterLightingPoint: (id) =>
    set((state) => ({
      colorFilters: {
        ...state.colorFilters,
        lightingPoints: state.colorFilters.lightingPoints.filter(
          (point) => point.id !== id,
        ),
      },
    })),

  updateColorFilterLightingPoint: (id, patch) =>
    set((state) => ({
      colorFilters: {
        ...state.colorFilters,
        lightingPoints: state.colorFilters.lightingPoints.map((point) =>
          point.id === id ? { ...point, ...patch } : point,
        ),
      },
    })),

  setPlacingLighting: (placingLighting) => set({ placingLighting }),

  resetColorFilters: () =>
    set({
      colorFilters: { ...DEFAULT_COLOR_FILTER_SETTINGS },
      placingLighting: false,
    }),

  applyColorFilters: () => {
    const state = get();
    if (state.readOnly) {
      return;
    }

    const changes = computeFilterCellChanges(
      state.pixels,
      state.gridWidth,
      state.gridHeight,
      state.paletteColors,
      state.colorFilters,
    );

    if (changes.length === 0) {
      return;
    }

    get().dispatch(new PaintCellsCommand(changes));
  },

  advancePlaybackFrame: () => {
    const state = get();
    if (!state.isPlaying || state.frameCount <= 1) {
      return false;
    }

    const nextIndex = state.activeFrameIndex + 1;
    if (nextIndex >= state.frameCount) {
      if (!state.animationLoop) {
        set({ isPlaying: false, readOnly: false });
        return false;
      }
      const firstFrame = state.framePixelsByIndex[0];
      if (!firstFrame) {
        return false;
      }
      set({
        activeFrameIndex: 0,
        pixels: new Uint8Array(firstFrame),
      });
      return true;
    }

    const nextPixels = state.framePixelsByIndex[nextIndex];
    if (!nextPixels) {
      return false;
    }

    set({
      activeFrameIndex: nextIndex,
      pixels: new Uint8Array(nextPixels),
    });
    return true;
  },

  setHoverCell: (cell) => set({ hoverCell: cell }),
  setContainerSize: (size) => set({ containerSize: size }),
  setViewport: (viewport) =>
    set({
      zoom: clampZoom(viewport.zoom),
      panX: viewport.panX,
      panY: viewport.panY,
    }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomIn: (anchor) => {
    const { zoom, panX, panY } = get();
    const next = computeZoomIn({ zoom, panX, panY }, anchor);
    set(next);
  },
  zoomOut: (anchor) => {
    const { zoom, panX, panY } = get();
    const next = computeZoomOut({ zoom, panX, panY }, anchor);
    set(next);
  },
  fitToView: (size) => {
    const state = get();
    const container = size ?? state.containerSize;
    if (container.width <= 0 || container.height <= 0) {
      return;
    }
    const viewport = computeFitToView(
      container,
      state.gridWidth,
      state.gridHeight,
    );
    set(viewport);
  },

  dispatch: (commandOrCommands) => {
    const commands = Array.isArray(commandOrCommands)
      ? commandOrCommands
      : [commandOrCommands];
    if (commands.length === 0) {
      return;
    }

    const state = get();
    if (state.readOnly) {
      return;
    }

    const pixels = new Uint8Array(state.pixels);
    applyCommands(pixels, state.gridWidth, commands, "apply");

    set({
      pixels,
      framePixelsByIndex: writeFramePixels(
        state.framePixelsByIndex,
        state.activeFrameIndex,
        pixels,
      ),
      undoStack: pushCommands(state.undoStack, commands),
      redoStack: [],
      isDirty: true,
      frameSyncStatus: "idle",
      frameSyncError: null,
      ...reconcileDerivedSync(
        "idle",
        get().paletteSyncStatus,
        null,
        get().paletteSyncError,
      ),
    });

    scheduleFrameSync();
  },

  undo: () => {
    const state = get();
    if (state.readOnly || state.undoStack.length === 0) {
      return;
    }

    const command = state.undoStack[state.undoStack.length - 1]!;
    const pixels = new Uint8Array(state.pixels);
    command.revert(pixels, state.gridWidth);

    set({
      pixels,
      framePixelsByIndex: writeFramePixels(
        state.framePixelsByIndex,
        state.activeFrameIndex,
        pixels,
      ),
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, command],
      isDirty: true,
      frameSyncStatus: "idle",
      frameSyncError: null,
      ...reconcileDerivedSync(
        "idle",
        state.paletteSyncStatus,
        null,
        state.paletteSyncError,
      ),
    });

    scheduleFrameSync();
  },

  redo: () => {
    const state = get();
    if (state.readOnly || state.redoStack.length === 0) {
      return;
    }

    const command = state.redoStack[state.redoStack.length - 1]!;
    const pixels = new Uint8Array(state.pixels);
    command.apply(pixels, state.gridWidth);

    set({
      pixels,
      framePixelsByIndex: writeFramePixels(
        state.framePixelsByIndex,
        state.activeFrameIndex,
        pixels,
      ),
      undoStack: pushCommands(state.undoStack, [command]),
      redoStack: state.redoStack.slice(0, -1),
      isDirty: true,
      frameSyncStatus: "idle",
      frameSyncError: null,
      ...reconcileDerivedSync(
        "idle",
        state.paletteSyncStatus,
        null,
        state.paletteSyncError,
      ),
    });

    scheduleFrameSync();
  },

  addPaletteColor: (hexInput) => {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      return;
    }

    const state = get();
    if (state.paletteLocked || state.paletteColors.length >= PALETTE_MAX_COLORS) {
      return;
    }

    const paletteColors = [...state.paletteColors, normalized];
    set({
      paletteColors,
      activeColorIndex: paletteColors.length - 1,
      isPaletteDirty: true,
      paletteSyncStatus: "idle",
      paletteSyncError: null,
      ...reconcileDerivedSync(
        get().frameSyncStatus,
        "idle",
        get().frameSyncError,
        null,
      ),
    });
    schedulePaletteSync();
  },

  updatePaletteColor: (index, hexInput) => {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      return;
    }

    const state = get();
    if (state.paletteLocked || index < 0 || index >= state.paletteColors.length) {
      return;
    }

    const paletteColors = [...state.paletteColors];
    paletteColors[index] = normalized;

    set({
      paletteColors,
      isPaletteDirty: true,
      paletteSyncStatus: "idle",
      paletteSyncError: null,
      ...reconcileDerivedSync(
        state.frameSyncStatus,
        "idle",
        state.frameSyncError,
        null,
      ),
    });
    schedulePaletteSync();
  },

  savePalette: () => {
    void flushPaletteSync();
  },

  removePaletteColor: (index) => {
    const state = get();
    if (
      state.paletteLocked ||
      index < 0 ||
      index >= state.paletteColors.length ||
      state.paletteColors.length <= PALETTE_MIN_COLORS
    ) {
      return;
    }

    const paletteColors = state.paletteColors.filter((_, i) => i !== index);
    const pixels = remapPixelsAfterRemove(state.pixels, index);

    let activeColorIndex = state.activeColorIndex;
    if (index === activeColorIndex) {
      activeColorIndex = 0;
    } else if (index < activeColorIndex) {
      activeColorIndex -= 1;
    }

    set({
      paletteColors,
      pixels,
      framePixelsByIndex: writeFramePixels(
        state.framePixelsByIndex,
        state.activeFrameIndex,
        pixels,
      ),
      activeColorIndex,
      isDirty: true,
      isPaletteDirty: true,
      frameSyncStatus: "idle",
      paletteSyncStatus: "idle",
      frameSyncError: null,
      paletteSyncError: null,
      ...reconcileDerivedSync("idle", "idle", null, null),
    });

    scheduleFrameSync();
    schedulePaletteSync();
  },

  markFrameSynced: () =>
    set((state) => {
      const frameSyncStatus: SyncStatus = "idle";
      const frameSyncError = null;
      return {
        isDirty: false,
        frameSyncStatus,
        frameSyncError,
        ...reconcileDerivedSync(
          frameSyncStatus,
          state.paletteSyncStatus,
          frameSyncError,
          state.paletteSyncError,
        ),
      };
    }),

  markPaletteSynced: () =>
    set((state) => {
      const paletteSyncStatus: SyncStatus = "idle";
      const paletteSyncError = null;
      return {
        isPaletteDirty: false,
        paletteSyncStatus,
        paletteSyncError,
        ...reconcileDerivedSync(
          state.frameSyncStatus,
          paletteSyncStatus,
          state.frameSyncError,
          paletteSyncError,
        ),
      };
    }),

  setFrameSyncStatus: (status, error = null) =>
    set((state) => {
      const frameSyncError = status === "error" ? error : null;
      return {
        frameSyncStatus: status,
        frameSyncError,
        ...reconcileDerivedSync(
          status,
          state.paletteSyncStatus,
          frameSyncError,
          state.paletteSyncError,
        ),
      };
    }),

  setPaletteSyncStatus: (status, error = null) =>
    set((state) => {
      const paletteSyncError = status === "error" ? error : null;
      return {
        paletteSyncStatus: status,
        paletteSyncError,
        ...reconcileDerivedSync(
          state.frameSyncStatus,
          status,
          state.frameSyncError,
          paletteSyncError,
        ),
      };
    }),

  setBundlePath: (bundlePath) => set({ bundlePath }),
  setAssetType: (assetType) => set({ assetType }),

  reloadAllFrames: async (frameCount, activeIndex = 0) => {
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
      ...reconcileDerivedSync("idle", "idle", null, null),
    });

    return { ok: true };
  },

  applyFramePixelsAtIndex: (index, pixels) => {
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
        ...reconcileDerivedSync("idle", "idle", null, null),
      });
      return;
    }

    set({ framePixelsByIndex });
  },
}));

export const useActiveTool = () => useEditorStore((s) => s.activeTool);
export const useActiveColorIndex = () =>
  useEditorStore((s) => s.activeColorIndex);
export const usePaletteColors = () => useEditorStore((s) => s.paletteColors);
export const useFrameCount = () => useEditorStore((s) => s.frameCount);
export const useProjectName = () => useEditorStore((s) => s.projectName);
export const useBundlePath = () => useEditorStore((s) => s.bundlePath);
export const useHoverCell = () => useEditorStore((s) => s.hoverCell);
export const useCanUndo = () =>
  useEditorStore((s) => !s.readOnly && s.undoStack.length > 0);
export const useCanRedo = () =>
  useEditorStore((s) => !s.readOnly && s.redoStack.length > 0);
export const useReadOnly = () => useEditorStore((s) => s.readOnly);
export const usePaletteLocked = () => useEditorStore((s) => s.paletteLocked);
export const useIsPaletteDirty = () => useEditorStore((s) => s.isPaletteDirty);
export const useActiveFrameIndex = () =>
  useEditorStore((s) => s.activeFrameIndex);
export const useIsPlaying = () => useEditorStore((s) => s.isPlaying);
export const useAnimationFps = () => useEditorStore((s) => s.animationFps);
export const useAnimationLoop = () => useEditorStore((s) => s.animationLoop);
export const useOnionSkinEnabled = () =>
  useEditorStore((s) => s.onionSkinEnabled);
export const useColorFilters = () => useEditorStore((s) => s.colorFilters);
export const usePlacingLighting = () =>
  useEditorStore((s) => s.placingLighting);
export const useFramePixelsByIndex = () =>
  useEditorStore((s) => s.framePixelsByIndex);
