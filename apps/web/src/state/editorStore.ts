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
import type { Command } from "@/state/commands/types";
import { pushCommands } from "@/state/commands/undoStack";
import {
  PALETTE_MAX_COLORS,
  PALETTE_MIN_COLORS,
  normalizeHex,
  remapPixelsAfterRemove,
} from "@/state/paletteUtils";
import {
  flushPaletteSync,
  scheduleFrameSync,
  schedulePaletteSync,
} from "@/state/persist";

const DEFAULT_GRID_SIZE = 32;

function createEmptyPixels(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height);
}

export type SyncStatus = "idle" | "syncing" | "error";

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
  undoStack: Command[];
  redoStack: Command[];
  isDirty: boolean;
  isPaletteDirty: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  setProject: (params: {
    projectId: string;
    name: string;
    gridWidth: number;
    gridHeight: number;
    frameCount: number;
    pixels: Uint8Array;
    paletteColors: readonly string[];
  }) => void;
  setActiveTool: (tool: ToolId) => void;
  setActiveColorIndex: (index: number) => void;
  setFrameCount: (count: number) => void;
  setReadOnly: (readOnly: boolean) => void;
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
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
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
  undoStack: [],
  redoStack: [],
  isDirty: false,
  isPaletteDirty: false,
  syncStatus: "idle",
  syncError: null,

  setProject: ({
    projectId,
    name,
    gridWidth,
    gridHeight,
    frameCount,
    pixels,
    paletteColors,
  }) =>
    set({
      projectId,
      projectName: name,
      gridWidth,
      gridHeight,
      frameCount,
      pixels,
      paletteColors,
      activeFrameIndex: 0,
      undoStack: [],
      redoStack: [],
      isDirty: false,
      isPaletteDirty: false,
      syncStatus: "idle",
      syncError: null,
    }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveColorIndex: (index) => {
    const { paletteColors } = get();
    const clamped = Math.max(0, Math.min(index, paletteColors.length - 1));
    set({ activeColorIndex: clamped });
  },
  setFrameCount: (count) => set({ frameCount: count }),
  setReadOnly: (readOnly) => set({ readOnly }),
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
      undoStack: pushCommands(state.undoStack, commands),
      redoStack: [],
      isDirty: true,
      syncStatus: "idle",
      syncError: null,
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
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, command],
      isDirty: true,
      syncStatus: "idle",
      syncError: null,
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
      undoStack: pushCommands(state.undoStack, [command]),
      redoStack: state.redoStack.slice(0, -1),
      isDirty: true,
      syncStatus: "idle",
      syncError: null,
    });

    scheduleFrameSync();
  },

  addPaletteColor: (hexInput) => {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      return;
    }

    const state = get();
    if (state.paletteColors.length >= PALETTE_MAX_COLORS) {
      return;
    }

    const paletteColors = [...state.paletteColors, normalized];
    set({
      paletteColors,
      activeColorIndex: paletteColors.length - 1,
      isPaletteDirty: true,
      syncStatus: "idle",
      syncError: null,
    });
  },

  updatePaletteColor: (index, hexInput) => {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      return;
    }

    const state = get();
    if (index < 0 || index >= state.paletteColors.length) {
      return;
    }

    const paletteColors = [...state.paletteColors];
    paletteColors[index] = normalized;

    set({
      paletteColors,
      isPaletteDirty: true,
      syncStatus: "idle",
      syncError: null,
    });
  },

  savePalette: () => {
    void flushPaletteSync();
  },

  removePaletteColor: (index) => {
    const state = get();
    if (
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
      activeColorIndex,
      isDirty: true,
      isPaletteDirty: true,
      syncStatus: "idle",
      syncError: null,
    });

    scheduleFrameSync();
    schedulePaletteSync();
  },

  markFrameSynced: () =>
    set((state) => ({
      isDirty: false,
      ...(state.isPaletteDirty
        ? {}
        : { syncStatus: "idle" as SyncStatus, syncError: null }),
    })),

  markPaletteSynced: () =>
    set((state) => ({
      isPaletteDirty: false,
      ...(state.isDirty
        ? {}
        : { syncStatus: "idle" as SyncStatus, syncError: null }),
    })),

  setSyncStatus: (status, error = null) =>
    set({ syncStatus: status, syncError: error }),
}));

export const useActiveTool = () => useEditorStore((s) => s.activeTool);
export const useActiveColorIndex = () =>
  useEditorStore((s) => s.activeColorIndex);
export const usePaletteColors = () => useEditorStore((s) => s.paletteColors);
export const useFrameCount = () => useEditorStore((s) => s.frameCount);
export const useProjectName = () => useEditorStore((s) => s.projectName);
export const useHoverCell = () => useEditorStore((s) => s.hoverCell);
export const useCanUndo = () =>
  useEditorStore((s) => !s.readOnly && s.undoStack.length > 0);
export const useCanRedo = () =>
  useEditorStore((s) => !s.readOnly && s.redoStack.length > 0);
export const useReadOnly = () => useEditorStore((s) => s.readOnly);
