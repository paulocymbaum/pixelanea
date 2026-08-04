import { create } from "zustand";
import type { CellCoord } from "@/canvas/coordinates";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import {
  clampOnionSkinOpacity,
  ONION_SKIN_OPACITY,
} from "@/canvas/renderer";
import type { ToolId } from "@/tools/registry";
import type { AssetType } from "@pixelanea/api-client";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import { DEFAULT_ASSET_TYPE } from "@/content/assetTypes";
import type { Command } from "@/state/commands/types";
import {
  dispatchCommands,
  redoCommand,
  undoCommand,
} from "@/state/editorStoreCommands";
import { createColorFilterActions } from "@/state/editorStoreColorFilters";
import {
  createFrameActions,
  createFrameSyncActions,
} from "@/state/editorStoreFrames";
import { createPaletteActions } from "@/state/editorStorePalette";
import { writeFramePixels } from "@/state/frameCache";
import {
  clampAnimationFps,
  createEmptyPixels,
  createPlaybackActions,
} from "@/state/editorStorePlayback";
import {
  createSelectionActions,
  initialSelectionState,
} from "@/state/editorStoreSelection";
import {
  createClipboardActions,
  initialClipboardState,
  type ClipboardData,
} from "@/state/editorStoreClipboard";
import {
  createPasteActions,
  initialPasteState,
  type PastePreview,
} from "@/state/editorStorePaste";
import {
  createMoveActions,
  initialMoveState,
  type MovePreview,
} from "@/state/editorStoreMove";
import {
  createSelectionFeedbackActions,
  initialSelectionFeedbackState,
} from "@/state/editorStoreSelectionFeedback";
import {
  deriveSyncError,
  deriveSyncStatus,
  withPaletteSyncStatus,
  type SyncStatus,
} from "@/state/editorStoreSync";
import {
  applyStrokePreview,
  clearStrokePreview,
  resetStrokePreview,
} from "@/tools/strokePreview";
import {
  DEFAULT_COLOR_FILTER_SETTINGS,
  type ColorFilterSettings,
  type LightingPoint,
} from "@/lib/colorFilters";

const DEFAULT_GRID_SIZE = 32;
const DEFAULT_ANIMATION_FPS = 8;

export type { SyncStatus } from "@/state/editorStoreSync";

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
  sourcePaletteColors: readonly string[] | null;
  isStrokeActive: boolean;
  strokePreviewTick: number;
  hoverCell: CellCoord | null;
  readOnly: boolean;
  paletteLocked: boolean;
  framePixelsByIndex: Record<number, Uint8Array>;
  isPlaying: boolean;
  animationFps: number;
  animationLoop: boolean;
  animationBoomerang: boolean;
  playbackDirection: 1 | -1;
  onionSkinEnabled: boolean;
  onionSkinOpacity: number;
  colorFilters: ColorFilterSettings;
  placingLighting: boolean;
  undoStack: Command[];
  redoStack: Command[];
  isDirty: boolean;
  isPaletteDirty: boolean;
  bundleDirty: boolean;
  frameSyncStatus: SyncStatus;
  paletteSyncStatus: SyncStatus;
  frameSyncError: string | null;
  paletteSyncError: string | null;
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
    fps?: number;
    loop?: boolean;
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
  setAnimationBoomerang: (enabled: boolean) => void;
  preparePlaybackStart: () => void;
  setOnionSkinEnabled: (enabled: boolean) => void;
  setOnionSkinOpacity: (opacity: number) => void;
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
  previewCells: (
    changes: readonly import("@/state/commands/paintCells").CellChange[],
  ) => void;
  setStrokeActive: (active: boolean) => void;
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
  applyFrameReorder: (fromIndex: number, toIndex: number) => number;
  applyFramePixelsAtIndex: (index: number, pixels: Uint8Array) => void;
  selectionMoving: boolean;
  setSelectionMoving: (moving: boolean) => void;
  selection: SelectionRect | null;
  selectionPreview: SelectionRect | null;
  setSelection: (selection: SelectionRect | null) => void;
  clearSelection: () => void;
  nudgeSelection: (deltaX: number, deltaY: number) => void;
  setSelectionPreview: (selection: SelectionRect | null) => void;
  clipboard: ClipboardData | null;
  copySelection: () => Promise<boolean>;
  cutSelection: () => Promise<boolean>;
  duplicateSelection: () => Promise<boolean>;
  clearClipboard: () => void;
  pastePreview: PastePreview | null;
  startPastePreview: (originX?: number, originY?: number) => boolean;
  movePastePreview: (x: number, y: number) => void;
  nudgePastePreview: (deltaX: number, deltaY: number) => void;
  commitPaste: () => Promise<boolean>;
  cancelPaste: () => void;
  movePreview: MovePreview | null;
  startMovePreview: () => boolean;
  moveMovePreview: (originX: number, originY: number) => void;
  nudgeMovePreview: (deltaX: number, deltaY: number) => void;
  commitMove: () => boolean;
  cancelMove: () => void;
};

export const useEditorStore = create<EditorState>((set, get) => {
  const palette = createPaletteActions(get, set);
  const colorFilters = createColorFilterActions(get, set);
  const frames = createFrameActions(get, set);
  const frameSync = createFrameSyncActions(get, set);
  const playback = createPlaybackActions(get, set);
  const selection = createSelectionActions(get, set);
  const clipboard = createClipboardActions(get, set);
  const paste = createPasteActions(get, set);
  const move = createMoveActions(get, set);
  const selectionFeedback = createSelectionFeedbackActions(set);

  return {
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
    sourcePaletteColors: null,
    isStrokeActive: false,
    strokePreviewTick: 0,
    hoverCell: null,
    readOnly: false,
    paletteLocked: false,
    framePixelsByIndex: {},
    isPlaying: false,
    animationFps: DEFAULT_ANIMATION_FPS,
    animationLoop: true,
    animationBoomerang: false,
    playbackDirection: 1,
    onionSkinEnabled: true,
    onionSkinOpacity: ONION_SKIN_OPACITY,
    colorFilters: { ...DEFAULT_COLOR_FILTER_SETTINGS },
    placingLighting: false,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    isPaletteDirty: false,
    bundleDirty: false,
    frameSyncStatus: "idle",
    paletteSyncStatus: "idle",
    frameSyncError: null,
    paletteSyncError: null,
    bundlePath: null,
    assetType: DEFAULT_ASSET_TYPE,
    ...initialSelectionState,
    ...initialSelectionFeedbackState,
    ...initialClipboardState,
    ...initialPasteState,
    ...initialMoveState,

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
      fps = DEFAULT_ANIMATION_FPS,
      loop = true,
    }) =>
      set({
        projectId,
        projectName: name,
        gridWidth,
        gridHeight,
        frameCount,
        pixels,
        paletteColors,
        sourcePaletteColors: [...paletteColors],
        bundlePath,
        assetType,
        animationFps: clampAnimationFps(fps),
        animationLoop: loop,
        animationBoomerang: false,
        playbackDirection: 1,
        framePixelsByIndex: writeFramePixels({}, 0, pixels),
        activeFrameIndex: 0,
        undoStack: [],
        redoStack: [],
        isDirty: false,
        isPaletteDirty: false,
        bundleDirty: false,
        frameSyncStatus: "idle",
        paletteSyncStatus: "idle",
        frameSyncError: null,
        paletteSyncError: null,
        isPlaying: false,
        readOnly: false,
        colorFilters: { ...DEFAULT_COLOR_FILTER_SETTINGS },
        placingLighting: false,
        selection: null,
        selectionPreview: null,
        selectionMoving: false,
        clipboard: null,
        pastePreview: null,
        movePreview: null,
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

    ...palette,
    ...frames,
    ...playback,
    ...frameSync,
    ...selection,
    ...selectionFeedback,
    ...clipboard,
    ...paste,
    ...move,

    setOnionSkinEnabled: (onionSkinEnabled) => set({ onionSkinEnabled }),
    setOnionSkinOpacity: (opacity) =>
      set({ onionSkinOpacity: clampOnionSkinOpacity(opacity) }),

    ...colorFilters,

    setHoverCell: (cell) => set({ hoverCell: cell }),
    previewCells: (changes) => {
      if (changes.length === 0) {
        return;
      }

      const state = get();
      if (state.readOnly) {
        return;
      }

      applyStrokePreview(changes);
      set({ strokePreviewTick: state.strokePreviewTick + 1 });
    },
    setStrokeActive: (active) => {
      if (active) {
        resetStrokePreview();
      } else {
        clearStrokePreview();
      }
      set({ isStrokeActive: active });
    },

    dispatch: (commandOrCommands) =>
      dispatchCommands(get, set, commandOrCommands),

    undo: () => undoCommand(get, set),

    redo: () => redoCommand(get, set),

    markPaletteSynced: () =>
      set({
        isPaletteDirty: false,
        paletteSyncStatus: "idle",
        paletteSyncError: null,
      }),

    setPaletteSyncStatus: (status, error?: string | null) =>
      set((state) => withPaletteSyncStatus(state, status, error ?? null)),

    setBundlePath: (bundlePath) => set({ bundlePath, bundleDirty: false }),
    setAssetType: (assetType) => set({ assetType }),
  };
});

export const useSyncStatus = () =>
  useEditorStore((s) => deriveSyncStatus(s.frameSyncStatus, s.paletteSyncStatus));

export const useSyncError = () =>
  useEditorStore((s) => deriveSyncError(s.frameSyncError, s.paletteSyncError));

/** Snapshot helper for guards and file actions that read full store state. */
export function getDerivedSyncFields(
  state: Pick<
    EditorState,
    | "frameSyncStatus"
    | "paletteSyncStatus"
    | "frameSyncError"
    | "paletteSyncError"
  >,
): { syncStatus: SyncStatus; syncError: string | null } {
  return {
    syncStatus: deriveSyncStatus(state.frameSyncStatus, state.paletteSyncStatus),
    syncError: deriveSyncError(state.frameSyncError, state.paletteSyncError),
  };
}

export const useActiveTool = () => useEditorStore((s) => s.activeTool);
export const useActiveColorIndex = () =>
  useEditorStore((s) => s.activeColorIndex);
export const usePaletteColors = () => useEditorStore((s) => s.paletteColors);
export const useSourcePaletteColors = () =>
  useEditorStore((s) => s.sourcePaletteColors);
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
export const useAnimationBoomerang = () =>
  useEditorStore((s) => s.animationBoomerang);
export const usePlaybackDirection = () =>
  useEditorStore((s) => s.playbackDirection);
export const useOnionSkinEnabled = () =>
  useEditorStore((s) => s.onionSkinEnabled);
export const useOnionSkinOpacity = () =>
  useEditorStore((s) => s.onionSkinOpacity);
export const useColorFilters = () => useEditorStore((s) => s.colorFilters);
export const usePlacingLighting = () =>
  useEditorStore((s) => s.placingLighting);
export const useFramePixelsByIndex = () =>
  useEditorStore((s) => s.framePixelsByIndex);
export const useSelectionMoving = () =>
  useEditorStore((s) => s.selectionMoving);
export const useSelection = () => useEditorStore((s) => s.selection);
export const useSelectionPreview = () =>
  useEditorStore((s) => s.selectionPreview);
export const useClipboard = () => useEditorStore((s) => s.clipboard);
export const usePastePreview = () => useEditorStore((s) => s.pastePreview);
export const useMovePreview = () => useEditorStore((s) => s.movePreview);
