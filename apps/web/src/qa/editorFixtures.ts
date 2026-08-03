import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { useEditorStore } from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import { useViewportStore } from "@/state/viewportStore";
import { setSyncCoordinatorForTests, SyncCoordinator } from "@/state/persist";
import { captureFrameSnapshot } from "@/state/sync/snapshots";
import type { SaveResult } from "@/state/sync/types";
import { SYNC_DEBOUNCE_MS } from "@/state/sync/types";
import { vi, type Mock } from "vitest";

export const EDITOR_FIXTURE_PROJECT_ID = "matrix-project";

export type EditorFixtureOverrides = Partial<
  ReturnType<typeof useEditorStore.getState>
> & {
  viewport?: Partial<ReturnType<typeof useViewportStore.getState>>;
};

/** Composable editor + viewport reset for matrix harnesses. */
export function resetEditor(overrides: EditorFixtureOverrides = {}): void {
  const { viewport: viewportOverrides, ...editorOverrides } = overrides;
  const width = editorOverrides.gridWidth ?? 32;
  const height = editorOverrides.gridHeight ?? 32;
  const pixels =
    editorOverrides.pixels ?? new Uint8Array(width * height);

  useEditorStore.setState({
    projectId: EDITOR_FIXTURE_PROJECT_ID,
    projectName: "Matrix project",
    activeTool: "paint",
    activeColorIndex: 1,
    activeFrameIndex: 0,
    frameCount: 1,
    gridWidth: width,
    gridHeight: height,
    pixels: new Uint8Array(pixels),
    paletteColors: DEFAULT_PALETTE_COLORS,
    sourcePaletteColors: null,
    paletteLocked: false,
    readOnly: false,
    isPlaying: false,
    placingLighting: false,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    isPaletteDirty: false,
    bundleDirty: false,
    framePixelsByIndex: { 0: new Uint8Array(pixels) },
    frameSyncStatus: "idle",
    paletteSyncStatus: "idle",
    frameSyncError: null,
    paletteSyncError: null,
    isStrokeActive: false,
    strokePreviewTick: 0,
    animationFps: 8,
    animationLoop: true,
    onionSkinEnabled: true,
    bundlePath: null,
    assetType: "character",
    ...editorOverrides,
  });

  useViewportStore.setState({
    zoom: 1,
    panX: 0,
    panY: 0,
    viewportUserAdjusted: false,
    ...viewportOverrides,
  });
}

/** Preset: multi-frame project with tagged per-index cache buffers. */
export function withFrames(
  count: number,
  options: {
    gridSize?: number;
    identical?: boolean;
    projectId?: string;
    framePixelsByIndex?: Record<number, Uint8Array>;
  } = {},
): EditorFixtureOverrides {
  const size = options.gridSize ?? 8;
  const cache: Record<number, Uint8Array> =
    options.framePixelsByIndex ?? {};
  if (!options.framePixelsByIndex) {
    for (let index = 0; index < count; index++) {
      const pixels = new Uint8Array(size * size);
      pixels[0] = options.identical ? 1 : index + 1;
      cache[index] = pixels;
    }
  }
  const activeIndex = 0;
  return {
    projectId: options.projectId ?? EDITOR_FIXTURE_PROJECT_ID,
    gridWidth: size,
    gridHeight: size,
    frameCount: count,
    activeFrameIndex: activeIndex,
    framePixelsByIndex: { ...cache },
    pixels: new Uint8Array(cache[activeIndex] ?? new Uint8Array(size * size)),
  };
}

type SyncMockOptions = {
  saveFrame?: Mock;
  saveFrameDelta?: Mock;
  savePalette?: Mock;
  saveProjectSettings?: Mock;
  debounceMs?: number;
  frameCallbacks?: {
    onSyncing: () => void;
    onSuccess: () => void;
    onError: (message: string) => void;
  };
};

/** Composable session + UI reset for import wizard matrix cases. */
export function resetSession(
  overrides: Partial<ReturnType<typeof useSessionStore.getState>> = {},
): void {
  useSessionStore.setState({
    theme: "system",
    palettePanelWidth: 240,
    lastPalettePreset: null,
    lastImportPaletteMode: "image",
    lastImportColorCount: 8,
    hasVisited: false,
    lastEntryPath: "blank",
    lastResolution: 32,
    lastCanvasSize: { width: 32, height: 32 },
    lastFrameCount: 1,
    removeBackground: true,
    ...overrides,
  });

  useUiStore.setState({
    importWizardStep: 0,
    onboardingDismissed: false,
    onboardingStep: 0,
    apiStatus: "checking",
    apiVersion: null,
    toastMessage: null,
  });
}

/** Preset: in-memory SyncCoordinator with vi mocks for matrix autosave cases. */
export function withSyncMock(options: SyncMockOptions = {}): {
  coordinator: SyncCoordinator;
  saveFrame: Mock;
  saveFrameDelta: Mock;
  savePalette: Mock;
  saveProjectSettings: Mock;
} {
  const saveFrame =
    options.saveFrame ?? vi.fn(async (): Promise<SaveResult> => ({ ok: true }));
  const saveFrameDelta =
    options.saveFrameDelta ??
    vi.fn(async (): Promise<SaveResult> => ({ ok: true }));
  const savePalette =
    options.savePalette ??
    vi.fn(async (): Promise<SaveResult> => ({ ok: true }));
  const saveProjectSettings =
    options.saveProjectSettings ??
    vi.fn(async (): Promise<SaveResult> => ({ ok: true }));

  const coordinator = new SyncCoordinator(
    {
      saveFrame,
      saveFrameDelta,
      savePalette,
      saveProjectSettings,
      getFrameSnapshot: captureFrameSnapshot,
      getPaletteSnapshot: () => null,
      getProjectSettingsSnapshot: () => null,
      frameCallbacks: options.frameCallbacks ?? {
        onSyncing: () => {},
        onSuccess: () => {},
        onError: () => {},
      },
      paletteCallbacks: {
        onSyncing: () => {},
        onSuccess: () => {},
        onError: () => {},
      },
      projectSettingsCallbacks: {
        onSyncing: () => {},
        onSuccess: () => {},
        onError: () => {},
      },
    },
    options.debounceMs ?? SYNC_DEBOUNCE_MS,
  );

  setSyncCoordinatorForTests(coordinator);
  return {
    coordinator,
    saveFrame,
    saveFrameDelta,
    savePalette,
    saveProjectSettings,
  };
}

/** Frame autosave mock with store-linked status callbacks (animation matrix). */
export function withFrameSyncMock(
  saveFrameImpl: (
    projectId: string,
    frameIndex: number,
    pixels: Uint8Array,
  ) => Promise<SaveResult> = async () => ({ ok: true }),
  debounceMs = 0,
): Mock {
  const saveFrame = vi.fn(saveFrameImpl);
  return withSyncMock({
    saveFrame,
    debounceMs,
    frameCallbacks: {
      onSyncing: () => useEditorStore.getState().setFrameSyncStatus("syncing"),
      onSuccess: () => useEditorStore.getState().markFrameSynced(),
      onError: (message) =>
        useEditorStore.getState().setFrameSyncStatus("error", message),
    },
  }).saveFrame;
}
