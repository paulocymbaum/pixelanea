import type {
  CreateProjectRequest,
  PixelateImportRequest,
  PixelateImportResponse,
  Project,
} from "@pixelanea/api-client";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { SkippableOverlay } from "@/components/onboarding/SkippableOverlay";
import { getPalettePreset } from "@/components/palette/palettePresets";
import { useProjectFileActions } from "@/components/project/useProjectFileActions";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { NewProjectPage } from "@/pages/NewProjectPage";
import { useEditorStore } from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import {
  setSyncCoordinatorForTests,
  SyncCoordinator,
} from "@/state/persist";
import { captureFrameSnapshot } from "@/state/sync/snapshots";
import { paintCell, pixelAt } from "./paintMatrixHarness";
import {
  acceptButton,
  advanceToPaletteStep,
  apiPalette,
  base64ForFile,
  clickAccept,
  clickBack,
  clickNext,
  clickStepTab,
  deferred,
  dropAcceptedFile,
  dropFile,
  hexToRgb,
  imageFile,
  installQueuedFileReader,
  isPixelatingVisible,
  nextButton,
  pickFile,
  pixelateResponse,
  pixelsWithTransparentBorder,
  previewCanvas,
  previewRgbAt,
  removeBackgroundToggle,
  renderImportWizard,
  resetImportSession,
  restoreFileReader,
  selectPalettePreset,
  selectResolution,
  stubMatchMedia,
  stubPreviewCanvas,
  toggleRemoveBackground,
  waitForPreview,
  type PreviewCapture,
} from "./importMatrixHarness";

const {
  checkHealthMock,
  createBlankProjectMock,
  fetchPaletteMock,
  loadProjectIntoEditorMock,
  pixelateImageMock,
  saveFrameMock,
  saveImportPaletteMock,
  saveProjectToBundleMock,
} = vi.hoisted(() => ({
  checkHealthMock: vi.fn(),
  createBlankProjectMock: vi.fn(),
  fetchPaletteMock: vi.fn(),
  loadProjectIntoEditorMock: vi.fn(),
  pixelateImageMock: vi.fn(),
  saveFrameMock: vi.fn(),
  saveImportPaletteMock: vi.fn(),
  saveProjectToBundleMock: vi.fn(),
}));

vi.mock("@/api/health", () => ({ checkHealth: checkHealthMock }));

vi.mock("@/api/import", () => ({ pixelateImage: pixelateImageMock }));

vi.mock("@/api/projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/projects")>();
  return {
    ...actual,
    createBlankProject: createBlankProjectMock,
    saveProjectToBundle: saveProjectToBundleMock,
  };
});

vi.mock("@/api/palette", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/palette")>();
  return {
    ...actual,
    saveImportPalette: saveImportPaletteMock,
    fetchPalette: fetchPaletteMock,
  };
});

vi.mock("@/api/frames", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/frames")>();
  return { ...actual, saveFrame: saveFrameMock };
});

vi.mock("@/hooks/useLoadProject", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useLoadProject")>();
  return { ...actual, loadProjectIntoEditor: loadProjectIntoEditorMock };
});

import { applyLoadedProjectToEditor } from "@/hooks/useLoadProject";
import { paletteColorsFromApi } from "@/api/palette";

const RETRO_COLORS = getPalettePreset("retro")!.colors;
const GAMEBOY_COLORS = getPalettePreset("gameboy")!.colors;
const MONOCHROME_COLORS = getPalettePreset("monochrome")!.colors;
const IMPORTED_BUNDLE_PATH = "/tmp/imported.pixelanea";

type ProjectMeta = { width: number; height: number; frameCount: number };

let projectCounter = 0;
let projectMeta = new Map<string, ProjectMeta>();
let savedPaletteColors: readonly string[] | null = null;
let lastPixelate: PixelateImportResponse | null = null;
let capture: PreviewCapture;

function makeProject(id: string, params: CreateProjectRequest): Project {
  return {
    id,
    name: params.name,
    width: params.width,
    height: params.height,
    frameCount: params.frameCount ?? 1,
    fps: params.fps ?? 8,
    cellSize: params.cellSize ?? 16,
    assetType: "character",
    loop: params.loop ?? true,
    createdAt: "2026-07-31T00:00:00Z",
    updatedAt: "2026-07-31T00:00:00Z",
  };
}

function resetEditorStore(): void {
  const pixels = new Uint8Array(32 * 32);
  useEditorStore.setState({
    projectId: null,
    projectName: "",
    gridWidth: 32,
    gridHeight: 32,
    frameCount: 1,
    activeFrameIndex: 0,
    activeTool: "paint",
    activeColorIndex: 1,
    pixels,
    framePixelsByIndex: { 0: new Uint8Array(pixels) },
    paletteColors: DEFAULT_PALETTE_COLORS,
    paletteLocked: false,
    readOnly: false,
    isPlaying: false,
    bundlePath: null,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    isPaletteDirty: false,
  });
}

function installDefaultMocks(): void {
  checkHealthMock.mockResolvedValue({
    ok: true,
    health: { status: "ok", version: "1.0.0" },
  });

  createBlankProjectMock.mockImplementation(async (params: CreateProjectRequest) => {
    projectCounter += 1;
    const id = `proj-${projectCounter}`;
    projectMeta.set(id, {
      width: params.width,
      height: params.height,
      frameCount: params.frameCount ?? 1,
    });
    return { ok: true, project: makeProject(id, params) };
  });

  saveImportPaletteMock.mockImplementation(
    async (_projectId: string, colors: readonly string[]) => {
      savedPaletteColors = colors;
      return { ok: true };
    },
  );

  fetchPaletteMock.mockImplementation(async () => ({
    ok: true,
    palette: apiPalette(savedPaletteColors ?? RETRO_COLORS),
  }));

  pixelateImageMock.mockImplementation(
    async (_projectId: string, body: PixelateImportRequest) => {
      const response = pixelateResponse({
        width: body.targetWidth ?? 32,
        height: body.targetHeight ?? 32,
        fill: 1,
      });
      lastPixelate = response;
      return { ok: true, response };
    },
  );

  saveFrameMock.mockResolvedValue({ ok: true });

  saveProjectToBundleMock.mockImplementation(async (_id: string, path: string) => ({
    ok: true,
    path,
  }));

  // Mirrors the server round-trip: the accepted preview becomes editor state.
  loadProjectIntoEditorMock.mockImplementation(
    async (projectId: string, options?: { bundlePath?: string | null }) => {
      const meta = projectMeta.get(projectId) ?? {
        width: 32,
        height: 32,
        frameCount: 1,
      };
      const width = lastPixelate?.width ?? meta.width;
      const height = lastPixelate?.height ?? meta.height;
      const pixels = new Uint8Array(width * height);
      lastPixelate?.pixels.forEach((value, index) => {
        pixels[index] = value;
      });

      const data = {
        projectId,
        name: "Imported project",
        gridWidth: width,
        gridHeight: height,
        frameCount: meta.frameCount,
        pixels,
        paletteColors: paletteColorsFromApi(
          apiPalette(savedPaletteColors ?? RETRO_COLORS),
        ),
        bundlePath: options?.bundlePath ?? null,
        assetType: "character" as const,
        fps: 8,
        loop: true,
      };
      applyLoadedProjectToEditor(data);
      return { ok: true as const, data };
    },
  );
}

describe("QA-002 import matrix", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    projectCounter = 0;
    projectMeta = new Map();
    savedPaletteColors = null;
    lastPixelate = null;
    setSyncCoordinatorForTests(null);
    resetImportSession();
    resetEditorStore();
    installDefaultMocks();
    stubMatchMedia();
    capture = stubPreviewCanvas();
  });

  afterEach(() => {
    restoreFileReader();
    setSyncCoordinatorForTests(null);
  });

  describe("happy path", () => {
    it("[HP-001] full import wizard opens the editor with a pixelated grid", async () => {
      const { onComplete } = renderImportWizard();

      await dropAcceptedFile(imageFile("cat.png"));
      await clickNext();
      await selectResolution(32);
      await clickNext();
      await selectPalettePreset("retro");
      await clickNext();

      await waitForPreview(32);
      expect(pixelateImageMock).toHaveBeenCalledWith(
        "proj-1",
        expect.objectContaining({
          targetWidth: 32,
          targetHeight: 32,
          frameIndex: 0,
          removeBackground: true,
        }),
      );
      expect(saveImportPaletteMock).toHaveBeenCalledWith("proj-1", RETRO_COLORS);
      expect(previewRgbAt(capture, 0, 0)).toEqual(hexToRgb(RETRO_COLORS[0]!));

      await clickAccept();

      expect(loadProjectIntoEditorMock).toHaveBeenCalledWith("proj-1");
      expect(onComplete).toHaveBeenCalledTimes(1);

      const state = useEditorStore.getState();
      expect(state.projectId).toBe("proj-1");
      expect(state.gridWidth).toBe(32);
      expect(state.gridHeight).toBe(32);
      expect(state.pixels[0]).toBe(1);
      expect(state.paletteColors[1]).toBe(RETRO_COLORS[0]);
      expect(useSessionStore.getState().lastEntryPath).toBe("import");
      expect(useSessionStore.getState().hasVisited).toBe(true);
    });

    it("[HP-002] resolution presets each re-render the preview", async () => {
      renderImportWizard();
      await advanceToPaletteStep(imageFile("hero.png"), 16);
      await clickNext();
      await waitForPreview(16);
      expect(pixelateImageMock).toHaveBeenLastCalledWith(
        "proj-1",
        expect.objectContaining({ targetWidth: 16, targetHeight: 16 }),
      );

      for (const size of [32, 64] as const) {
        await clickStepTab("resolution");
        await selectResolution(size);
        await clickNext();
        await clickNext();
        await waitForPreview(size);
        expect(pixelateImageMock).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({ targetWidth: size, targetHeight: size }),
        );
        expect(previewCanvas().height).toBe(size);
      }

      expect(useSessionStore.getState().lastResolution).toBe(64);
    });

    it("[HP-003] palette presets quantize the preview to preset colors", async () => {
      renderImportWizard();
      await advanceToPaletteStep(imageFile("tree.png"), 16);

      const cases = [
        { id: "retro" as const, colors: RETRO_COLORS },
        { id: "gameboy" as const, colors: GAMEBOY_COLORS },
        { id: "monochrome" as const, colors: MONOCHROME_COLORS },
      ];

      for (const [index, preset] of cases.entries()) {
        if (index > 0) {
          await clickStepTab("palette");
        }
        await selectPalettePreset(preset.id);
        await clickNext();
        await waitForPreview(16);

        expect(saveImportPaletteMock).toHaveBeenLastCalledWith(
          expect.any(String),
          preset.colors,
        );
        expect(previewRgbAt(capture, 0, 0)).toEqual(hexToRgb(preset.colors[0]!));
        expect(useSessionStore.getState().lastPalettePreset).toBe(preset.id);
      }
    });

    it("[HP-004] background removal is on by default and keys out the background", async () => {
      pixelateImageMock.mockImplementation(
        async (_projectId: string, body: PixelateImportRequest) => {
          const response = pixelateResponse({
            width: body.targetWidth ?? 32,
            height: body.targetHeight ?? 32,
            pixels: pixelsWithTransparentBorder(
              body.targetWidth ?? 32,
              body.targetHeight ?? 32,
            ),
          });
          lastPixelate = response;
          return { ok: true, response };
        },
      );

      renderImportWizard();
      expect(useSessionStore.getState().removeBackground).toBe(true);

      await dropAcceptedFile(imageFile("portrait.jpg", "image/jpeg"));
      await clickNext();
      expect(removeBackgroundToggle()).toHaveAttribute("aria-pressed", "true");
      await clickNext();
      await clickNext();
      await waitForPreview(32);

      expect(pixelateImageMock).toHaveBeenCalledWith(
        "proj-1",
        expect.objectContaining({ removeBackground: true }),
      );
      // Transparent cells render as the checkerboard, not a palette color.
      expect(previewRgbAt(capture, 0, 0)).toEqual([204, 204, 204]);
      expect(previewRgbAt(capture, 1, 0)).toEqual([255, 255, 255]);
      expect(previewRgbAt(capture, 5, 5)).toEqual(hexToRgb(RETRO_COLORS[0]!));

      await clickAccept();
      const state = useEditorStore.getState();
      expect(state.pixels[0]).toBe(0);
      expect(state.pixels[5 * 32 + 5]).toBe(1);
    });

    it("[HP-005] background removal off keeps background pixels", async () => {
      renderImportWizard();
      await dropAcceptedFile(imageFile("portrait.jpg", "image/jpeg"));
      await clickNext();
      await toggleRemoveBackground();
      expect(removeBackgroundToggle()).toHaveAttribute("aria-pressed", "false");
      await clickNext();
      await clickNext();
      await waitForPreview(32);

      expect(pixelateImageMock).toHaveBeenCalledWith(
        "proj-1",
        expect.objectContaining({ removeBackground: false }),
      );
      expect(useSessionStore.getState().removeBackground).toBe(false);

      await clickAccept();
      expect(
        useEditorStore.getState().pixels.every((value) => value === 1),
      ).toBe(true);
    });

    it("[HP-006] import path never blocks on the onboarding overlay", async () => {
      render(<App />);
      await waitFor(() => {
        expect(checkHealthMock).toHaveBeenCalled();
      });

      await act(async () => {
        fireEvent.click(screen.getByText(copy.newProjectImportTitle));
      });
      expect(screen.getByText(copy.importWizardTitle)).toBeInTheDocument();
      expect(
        screen.queryByText(copy.onboardingStepPickColorTitle),
      ).not.toBeInTheDocument();

      await dropAcceptedFile(imageFile("sketch.png"));
      await clickNext();
      await clickNext();
      await clickNext();
      await waitForPreview(32);
      await clickAccept();

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });
      expect(
        screen.queryByText(copy.onboardingStepPickColorTitle),
      ).not.toBeInTheDocument();

      // The overlay only appears on the blank path, where skipping dismisses it
      // for the editor shell that gates on `onboardingDismissed`.
      cleanup();
      render(<SkippableOverlay />);
      fireEvent.click(screen.getByRole("button", { name: copy.onboardingSkip }));
      expect(useUiStore.getState().onboardingDismissed).toBe(true);
    });

    it("[HP-007] cleanup paint and undo work on the imported frame", async () => {
      renderImportWizard();
      await advanceToPaletteStep(imageFile("cat.png"), 16);
      await clickNext();
      await waitForPreview(16);
      await clickAccept();

      expect(pixelAt(3, 3)).toBe(1);
      paintCell(3, 3, 4);
      expect(pixelAt(3, 3)).toBe(4);
      paintCell(4, 3, 4);

      useEditorStore.getState().undo();
      useEditorStore.getState().undo();
      expect(pixelAt(3, 3)).toBe(1);
      expect(pixelAt(4, 3)).toBe(1);

      useEditorStore.getState().redo();
      expect(pixelAt(3, 3)).toBe(4);
    });
  });

  describe("race conditions", () => {
    it("[RACE-001] switching resolution mid-pixelate ends on the newer preview", async () => {
      const slow = deferred<{ ok: true; response: PixelateImportResponse }>();
      pixelateImageMock.mockImplementationOnce(() => slow.promise);

      renderImportWizard();
      await advanceToPaletteStep(imageFile("large.png"), 32);
      await clickNext();
      expect(isPixelatingVisible()).toBe(true);

      await clickStepTab("resolution");
      await selectResolution(64);

      // Stale 32×32 response lands after the user moved on.
      await act(async () => {
        slow.resolve({
          ok: true,
          response: pixelateResponse({ width: 32, height: 32, fill: 2 }),
        });
      });

      await clickNext();
      await clickNext();
      await waitForPreview(64);

      expect(pixelateImageMock).toHaveBeenLastCalledWith(
        "proj-2",
        expect.objectContaining({ targetWidth: 64, targetHeight: 64 }),
      );
      expect(previewCanvas().width).toBe(64);
      expect(previewCanvas().height).toBe(64);

      await clickAccept();
      expect(loadProjectIntoEditorMock).toHaveBeenLastCalledWith("proj-2");
      expect(useEditorStore.getState().gridWidth).toBe(64);
      expect(useEditorStore.getState().pixels.length).toBe(64 * 64);
    });

    it("[RACE-002] going back during pixelate leaves no hung spinner", async () => {
      const slow = deferred<{ ok: true; response: PixelateImportResponse }>();
      pixelateImageMock.mockImplementationOnce(() => slow.promise);

      renderImportWizard();
      await advanceToPaletteStep(imageFile("slow.png"), 32);
      await clickNext();
      expect(isPixelatingVisible()).toBe(true);

      await clickBack();
      expect(screen.getByText(copy.importWizardPaletteHint)).toBeInTheDocument();
      expect(isPixelatingVisible()).toBe(false);

      await act(async () => {
        slow.resolve({
          ok: true,
          response: pixelateResponse({ width: 32, height: 32, fill: 1 }),
        });
      });

      expect(nextButton()).toBeEnabled();
      expect(createBlankProjectMock).toHaveBeenCalledTimes(1);

      await clickNext();
      await waitForPreview(32);
      await clickAccept();
      expect(loadProjectIntoEditorMock).toHaveBeenCalledTimes(1);
    });

    it("[RACE-003] saving right after accept persists the frame before the bundle", async () => {
      const order: string[] = [];
      saveProjectToBundleMock.mockImplementation(async (_id: string, path: string) => {
        order.push("bundle");
        return { ok: true, path };
      });

      renderImportWizard();
      await advanceToPaletteStep(imageFile("cat.png"), 16);
      await clickNext();
      await waitForPreview(16);
      await clickAccept();

      setSyncCoordinatorForTests(
        new SyncCoordinator(
          {
            saveFrame: vi.fn(async () => {
              order.push("frame");
              return { ok: true as const };
            }),
            savePalette: vi.fn(async () => ({ ok: true as const })),
            saveProjectSettings: vi.fn(async () => ({ ok: true as const })),
            getFrameSnapshot: captureFrameSnapshot,
            getPaletteSnapshot: () => null,
            // This case is about frame-before-bundle ordering; animation
            // settings have their own coverage in persist.test.ts.
            getProjectSettingsSnapshot: () => null,
            frameCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: () => useEditorStore.getState().markFrameSynced(),
              onError: vi.fn(),
            },
            paletteCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: vi.fn(),
              onError: vi.fn(),
            },
            projectSettingsCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: vi.fn(),
              onError: vi.fn(),
            },
          },
          0,
        ),
      );

      // Stands in for the Save As dialog the user just confirmed.
      useEditorStore.getState().setBundlePath(IMPORTED_BUNDLE_PATH);
      paintCell(2, 2, 3);
      useEditorStore.setState({ isDirty: true });

      const { result } = renderHook(() =>
        useProjectFileActions({ onNewProject: vi.fn() }),
      );

      await act(async () => {
        result.current.onSave();
      });
      await waitFor(() => {
        expect(saveProjectToBundleMock).toHaveBeenCalledTimes(1);
      });

      expect(order).toEqual(["frame", "bundle"]);
      expect(saveProjectToBundleMock).toHaveBeenCalledWith(
        "proj-1",
        IMPORTED_BUNDLE_PATH,
        "character",
      );
    });

    it("[RACE-004] a second dropped file replaces the first without mixing state", async () => {
      const queue = installQueuedFileReader();
      const first = imageFile("a.png");
      const second = imageFile("b.png");

      renderImportWizard();
      await dropFile(first);
      await dropFile(second);
      expect(queue).toHaveLength(2);

      await act(async () => {
        queue[0]!.resolve();
      });
      await act(async () => {
        queue[1]!.resolve();
      });

      expect(screen.getByText("b.png")).toBeInTheDocument();
      expect(screen.queryByText("a.png")).not.toBeInTheDocument();

      await clickNext();
      await selectResolution(16);
      await clickNext();
      await clickNext();
      await waitForPreview(16);
      expect(pixelateImageMock).toHaveBeenCalledWith(
        "proj-1",
        expect.objectContaining({ imageData: base64ForFile(second) }),
      );

      // Out-of-order completion must still pair the shown file with its payload.
      cleanup();
      const outOfOrder = installQueuedFileReader();
      pixelateImageMock.mockClear();
      renderImportWizard();
      await dropFile(first);
      await dropFile(second);
      await act(async () => {
        outOfOrder[1]!.resolve();
      });
      await act(async () => {
        outOfOrder[0]!.resolve();
      });

      // Whichever read completes last wins; the payload must match what is shown.
      const shown = screen.queryByText("a.png") ? first : second;
      await clickNext();
      await selectResolution(16);
      await clickNext();
      await clickNext();
      await waitForPreview(16);
      expect(pixelateImageMock).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ imageData: base64ForFile(shown) }),
      );
    });
  });

  describe("edge cases", () => {
    it("[EDGE-001] a 1×1 image upscales to the chosen preset without crashing", async () => {
      renderImportWizard();
      await advanceToPaletteStep(imageFile("dot.png"), 64);
      await clickNext();
      await waitForPreview(64);

      expect(pixelateImageMock).toHaveBeenCalledWith(
        "proj-1",
        expect.objectContaining({ targetWidth: 64, targetHeight: 64 }),
      );
      expect(previewCanvas().height).toBe(64);
      expect(capture.last?.data.length).toBe(64 * 64 * 4);

      await clickAccept();
      expect(useEditorStore.getState().pixels.length).toBe(64 * 64);
    });

    it.skip("[EDGE-002] 4K image imports in under 2s", () => {
      // Needs the real C++ pixelate pipeline and wall-clock timing:
      // covered by server/tests/pixelate_pipeline_test.cpp plus an E2E perf run.
    });

    it("[EDGE-003] transparent PNG keeps alpha through preview and editor", async () => {
      pixelateImageMock.mockImplementation(
        async (_projectId: string, body: PixelateImportRequest) => {
          const width = body.targetWidth ?? 32;
          const height = body.targetHeight ?? 32;
          const response = pixelateResponse({
            width,
            height,
            pixels: pixelsWithTransparentBorder(width, height, 2),
          });
          lastPixelate = response;
          return { ok: true, response };
        },
      );

      renderImportWizard();
      await advanceToPaletteStep(imageFile("alpha.png"), 16);
      await clickNext();
      await waitForPreview(16);

      expect(pixelateImageMock).toHaveBeenCalledWith(
        "proj-1",
        expect.objectContaining({ removeBackground: true }),
      );
      expect(previewRgbAt(capture, 0, 0)).toEqual([204, 204, 204]);
      expect(previewRgbAt(capture, 8, 8)).toEqual(hexToRgb(RETRO_COLORS[1]!));

      await clickAccept();
      const state = useEditorStore.getState();
      expect(state.pixels[0]).toBe(0);
      expect(state.pixels[15]).toBe(0);
      expect(state.pixels[8 * 16 + 8]).toBe(2);
    });

    it("[EDGE-004] import creates a single frame; 8-frame path is blank quick-start only", async () => {
      renderImportWizard();
      await advanceToPaletteStep(imageFile("cat.png"), 16);
      await clickNext();
      await waitForPreview(16);
      await clickAccept();

      expect(createBlankProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ frameCount: 1 }),
      );
      expect(useEditorStore.getState().frameCount).toBe(1);

      cleanup();
      useSessionStore.setState({
        hasVisited: true,
        lastEntryPath: "blank",
        lastCanvasSize: { width: 32, height: 32 },
      });
      const onOpenEditor = vi.fn();
      render(
        <NewProjectPage onOpenEditor={onOpenEditor} onStartImport={vi.fn()} />,
      );
      fireEvent.click(screen.getByText(copy.newProjectQuickStart8(32, 32)));

      await waitFor(() => {
        expect(createBlankProjectMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ frameCount: 8 }),
        );
      });
      await waitFor(() => {
        expect(useEditorStore.getState().frameCount).toBe(8);
      });
      expect(onOpenEditor).toHaveBeenCalledWith("blank");
    });

    it("[EDGE-005] custom canvas size is accepted on the blank path", async () => {
      render(<NewProjectPage onOpenEditor={vi.fn()} onStartImport={vi.fn()} />);
      fireEvent.click(screen.getByText(copy.newProjectBlankTitle));
      fireEvent.click(screen.getByText(copy.customCanvasSizeLabel));
      fireEvent.change(screen.getByLabelText(copy.customCanvasSizeWidthLabel), {
        target: { value: "48" },
      });
      fireEvent.change(screen.getByLabelText(copy.customCanvasSizeHeightLabel), {
        target: { value: "64" },
      });
      fireEvent.click(screen.getByText(copy.customCanvasSizeConfirm));
      fireEvent.click(screen.getByText(copy.newProjectCreateBlank));

      await waitFor(() => {
        expect(createBlankProjectMock).toHaveBeenCalledWith(
          expect.objectContaining({ width: 48, height: 64, frameCount: 1 }),
        );
      });
      await waitFor(() => {
        expect(useEditorStore.getState().gridWidth).toBe(48);
      });
      expect(useEditorStore.getState().gridHeight).toBe(64);
      expect(useSessionStore.getState().lastCanvasSize).toEqual({
        width: 48,
        height: 64,
      });
    });
  });

  describe("error handling", () => {
    it("[ERR-001] unsupported file types are rejected and recoverable", async () => {
      renderImportWizard();

      await dropFile(new File(["notes"], "notes.txt", { type: "text/plain" }));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(errors.importFileType);
      });
      expect(nextButton()).toBeDisabled();
      expect(createBlankProjectMock).not.toHaveBeenCalled();

      await dropFile(imageFile("loop.gif", "image/gif"));
      expect(screen.getByRole("alert")).toHaveTextContent(errors.importFileType);

      await dropAcceptedFile(imageFile("cat.png"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(nextButton()).toBeEnabled();
    });

    it("[ERR-002] an unreadable image reports a plain-language error", async () => {
      const queue = installQueuedFileReader();
      renderImportWizard();

      await dropFile(imageFile("truncated.png"));
      await act(async () => {
        queue[0]!.fail();
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(errors.importFileRead);
      });
      expect(nextButton()).toBeDisabled();
      expect(createBlankProjectMock).not.toHaveBeenCalled();
      expect(useEditorStore.getState().projectId).toBeNull();

      await dropFile(imageFile("good.png"));
      await act(async () => {
        queue[1]!.resolve();
      });
      expect(screen.getByText("good.png")).toBeInTheDocument();
      expect(nextButton()).toBeEnabled();
    });

    it("[ERR-003] a failing pixelate call surfaces an error and allows retry", async () => {
      pixelateImageMock.mockResolvedValueOnce({
        ok: false,
        message: errors.importPixelateFailed,
      });

      renderImportWizard();
      await advanceToPaletteStep(imageFile("cat.png"), 32);
      await clickNext();

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          errors.importPixelateFailed,
        );
      });
      expect(isPixelatingVisible()).toBe(false);
      expect(acceptButton()).toBeDisabled();
      expect(loadProjectIntoEditorMock).not.toHaveBeenCalled();

      await clickBack();
      await clickNext();
      await waitForPreview(32);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await clickAccept();
      expect(loadProjectIntoEditorMock).toHaveBeenCalledTimes(1);
    });

    it("[ERR-004] cancelling the file picker leaves the wizard untouched", async () => {
      renderImportWizard();

      await pickFile();

      expect(screen.getByText(copy.importWizardDropHint)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(nextButton()).toBeDisabled();
      expect(createBlankProjectMock).not.toHaveBeenCalled();
      expect(useEditorStore.getState().projectId).toBeNull();

      await pickFile(imageFile("cat.png"));
      await waitFor(() => {
        expect(screen.getByText("cat.png")).toBeInTheDocument();
      });
      expect(nextButton()).toBeEnabled();
    });
  });
});
