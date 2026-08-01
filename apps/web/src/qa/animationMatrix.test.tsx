import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONION_SKIN_OPACITY } from "@/canvas/renderer";
import { Canvas } from "@/canvas/Canvas";
import { AnimationPlayer } from "@/components/animation/AnimationPlayer";
import { FrameDuplicateDialog } from "@/components/frames/FrameDuplicateDialog";
import { FrameThumbnailMenu } from "@/components/frames/FrameThumbnailMenu";
import { BottomFrameStrip } from "@/shell/BottomFrameStrip";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { useEditorStore } from "@/state/editorStore";
import { activeIndexAfterReorder } from "@/state/frameReorder";
import { setSyncCoordinatorForTests } from "@/state/persist";
import {
  activePixelAt,
  buildFrameCache,
  cachedMarker,
  cachedPixelAt,
  createDataTransfer,
  duplicateResponse,
  frameResponse,
  framePixels,
  GRID_SIZE,
  installFrameCoordinator,
  MATRIX_PROJECT_ID,
  paintActiveFrame,
  reorderResponse,
  resetAnimationProject,
  stubElementBox,
} from "./animationMatrixHarness";

vi.mock("@/api/frames", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/frames")>();
  return {
    ...actual,
    saveFrame: vi.fn(),
    fetchFrame: vi.fn(),
    duplicateFrames: vi.fn(),
    copyFrame: vi.fn(),
    reorderFrames: vi.fn(),
  };
});

vi.mock("@/canvas/renderer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/canvas/renderer")>();
  return {
    ...actual,
    renderGrid: vi.fn(),
    setupHiDpiCanvas: vi.fn(() => ({}) as CanvasRenderingContext2D),
    readCanvasTokens: vi.fn(() => ({
      checkerA: "#cccccc",
      checkerB: "#ffffff",
      gridLine: "rgba(0,0,0,0.08)",
    })),
  };
});

import {
  copyFrame,
  duplicateFrames,
  fetchFrame,
  reorderFrames,
  saveFrame,
} from "@/api/frames";
import { renderGrid } from "@/canvas/renderer";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Answer every uncached frame fetch with the marker buffer for that index. */
function fetchFramesFromMarkers(markers: Record<number, number> = {}) {
  vi.mocked(fetchFrame).mockImplementation(async (_projectId, index) => ({
    ok: true,
    frame: frameResponse(index, framePixels(markers[index] ?? 0)),
  }));
}

function openDuplicateDialog() {
  const onOpenChange = vi.fn();
  render(<FrameDuplicateDialog open onOpenChange={onOpenChange} />);
  return onOpenChange;
}

async function confirmDuplicate(preset: 8 | 16 | 32) {
  fireEvent.click(
    screen.getByRole("button", { name: copy.newProjectAnimationFrames(preset) }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: copy.frameDuplicateConfirm }),
  );
  await waitFor(() => {
    expect(duplicateFrames).toHaveBeenCalled();
  });
}

function lastRenderCall() {
  return vi.mocked(renderGrid).mock.calls.at(-1)?.[0];
}

describe("QA-003 animation matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncCoordinatorForTests(null);
    vi.mocked(saveFrame).mockResolvedValue({ ok: true });
    fetchFramesFromMarkers();
    resetAnimationProject();
  });

  describe("happy path", () => {
    it("[HP-001] duplicate current frame to 8", async () => {
      resetAnimationProject({
        frameCount: 1,
        framePixelsByIndex: { 0: framePixels(5) },
        pixels: framePixels(5),
      });
      vi.mocked(duplicateFrames).mockResolvedValue({
        ok: true,
        response: duplicateResponse(8),
      });
      fetchFramesFromMarkers(
        Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, 5])),
      );

      const onOpenChange = openDuplicateDialog();
      await confirmDuplicate(8);

      await waitFor(() => {
        expect(useEditorStore.getState().frameCount).toBe(8);
      });
      expect(duplicateFrames).toHaveBeenCalledWith(MATRIX_PROJECT_ID, {
        frameCount: 8,
        sourceFrameIndex: 0,
        fillMode: "copy",
      });
      for (let index = 0; index < 8; index++) {
        expect(cachedMarker(index)).toBe(5);
      }
      expect(onOpenChange).toHaveBeenCalledWith(false);

      render(<BottomFrameStrip />);
      expect(screen.getByLabelText(copy.frameStripLabel)).toBeInTheDocument();
      expect(screen.getByLabelText(copy.frameThumbnail(7))).toBeInTheDocument();
    });

    it("[HP-002] duplicate to 16 and 32", async () => {
      for (const preset of [16, 32] as const) {
        resetAnimationProject({
          frameCount: 1,
          framePixelsByIndex: { 0: framePixels(5) },
          pixels: framePixels(5),
        });
        vi.mocked(duplicateFrames).mockResolvedValue({
          ok: true,
          response: duplicateResponse(preset),
        });

        const onOpenChange = openDuplicateDialog();
        await confirmDuplicate(preset);

        await waitFor(() => {
          expect(useEditorStore.getState().frameCount).toBe(preset);
        });
        expect(duplicateFrames).toHaveBeenLastCalledWith(MATRIX_PROJECT_ID, {
          frameCount: preset,
          sourceFrameIndex: 0,
          fillMode: "copy",
        });
        expect(onOpenChange).toHaveBeenCalledWith(false);
      }
    });

    it("[HP-003] switch active frame from the strip", async () => {
      resetAnimationProject({ frameCount: 8 });
      render(<BottomFrameStrip />);

      fireEvent.click(screen.getByLabelText(copy.frameThumbnail(2)));

      await waitFor(() => {
        expect(useEditorStore.getState().activeFrameIndex).toBe(2);
      });
      expect(activePixelAt(0, 0)).toBe(3);
      expect(screen.getByLabelText(copy.frameThumbnail(2))).toHaveAttribute(
        "aria-current",
        "true",
      );
    });

    it("[HP-004] paint on non-active frame stays isolated", async () => {
      installFrameCoordinator();
      resetAnimationProject({ frameCount: 4 });

      await useEditorStore.getState().switchFrame(1);
      paintActiveFrame(2, 2, 6);
      expect(cachedPixelAt(1, 2, 2)).toBe(6);

      await useEditorStore.getState().switchFrame(0);
      expect(activePixelAt(2, 2)).toBe(0);
      expect(activePixelAt(0, 0)).toBe(1);
      expect(cachedPixelAt(1, 2, 2)).toBe(6);
    });

    it("[HP-005] play then pause", async () => {
      resetAnimationProject({ frameCount: 8 });
      render(<AnimationPlayer />);

      fireEvent.click(screen.getByLabelText(copy.animationPlay));
      await waitFor(() => {
        expect(useEditorStore.getState().isPlaying).toBe(true);
      });
      expect(useEditorStore.getState().readOnly).toBe(true);

      expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
      expect(useEditorStore.getState().activeFrameIndex).toBe(1);
      expect(activePixelAt(0, 0)).toBe(2);

      paintActiveFrame(3, 3, 7);
      expect(activePixelAt(3, 3)).toBe(0);

      fireEvent.click(await screen.findByLabelText(copy.animationPause));
      await waitFor(() => {
        expect(useEditorStore.getState().isPlaying).toBe(false);
      });
      expect(useEditorStore.getState().readOnly).toBe(false);
    });

    it("[HP-006] fps slider drives playback speed", () => {
      resetAnimationProject({ frameCount: 8 });
      render(<AnimationPlayer />);

      const slider = screen.getByRole("slider", { name: copy.animationFps });
      expect(slider).toHaveAttribute("aria-valuemin", "1");
      expect(slider).toHaveAttribute("aria-valuemax", "24");

      for (let i = 0; i < 4; i++) {
        fireEvent.keyDown(slider, { key: "ArrowRight" });
      }

      expect(useEditorStore.getState().animationFps).toBe(12);
      expect(screen.getByText(copy.animationFpsValue(12))).toBeInTheDocument();
      expect(1000 / useEditorStore.getState().animationFps).toBeCloseTo(83.33, 1);
    });

    it("[HP-007] loop toggle stops on last frame when off", () => {
      resetAnimationProject({ frameCount: 4, activeFrameIndex: 3 });
      render(<AnimationPlayer />);

      fireEvent.click(screen.getByLabelText(copy.animationLoopOn));
      expect(useEditorStore.getState().animationLoop).toBe(false);

      useEditorStore.setState({ isPlaying: true, readOnly: true });
      expect(useEditorStore.getState().advancePlaybackFrame()).toBe(false);
      expect(useEditorStore.getState().isPlaying).toBe(false);
      expect(useEditorStore.getState().activeFrameIndex).toBe(3);

      useEditorStore.setState({ animationLoop: true, isPlaying: true });
      expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
      expect(useEditorStore.getState().activeFrameIndex).toBe(0);
    });

    it("[HP-008] onion skin ghosts the previous frame", () => {
      const restoreBox = stubElementBox();
      try {
        resetAnimationProject({
          frameCount: 8,
          activeFrameIndex: 3,
          onionSkinEnabled: true,
        });
        render(<Canvas />);

        const options = lastRenderCall();
        expect(options?.onionSkinPixels).toBeDefined();
        expect(options?.onionSkinPixels?.[0]).toBe(3);
        expect(ONION_SKIN_OPACITY).toBe(0.3);

        act(() => {
          useEditorStore.getState().setOnionSkinEnabled(false);
        });
        expect(lastRenderCall()?.onionSkinPixels).toBeUndefined();
      } finally {
        restoreBox();
      }
    });

    it("[HP-009] copy frame to frame", async () => {
      resetAnimationProject({ frameCount: 4, activeFrameIndex: 1 });
      vi.mocked(copyFrame).mockResolvedValue({
        ok: true,
        response: { frame: { index: 3, width: GRID_SIZE, height: GRID_SIZE, updatedAt: "" } },
      });

      render(<FrameThumbnailMenu frameIndex={3} frameCount={4} />);
      fireEvent.keyDown(screen.getByLabelText(copy.frameCopyFromMenu), {
        key: "Enter",
      });

      const item = await screen.findByRole("menuitem", {
        name: copy.frameCopyFromOption(0),
      });
      fireEvent.click(item);

      await waitFor(() => {
        expect(cachedMarker(3)).toBe(1);
      });
      expect(copyFrame).toHaveBeenCalledWith(MATRIX_PROJECT_ID, {
        sourceFrameIndex: 0,
        targetFrameIndex: 3,
      });
    });

    it("[HP-010] reorder frames by drag and drop", async () => {
      resetAnimationProject({ frameCount: 4, activeFrameIndex: 1 });
      vi.mocked(reorderFrames).mockResolvedValue({
        ok: true,
        response: reorderResponse(4),
      });
      render(<BottomFrameStrip />);

      const dataTransfer = createDataTransfer();
      fireEvent.dragStart(screen.getByLabelText(copy.frameThumbnail(3)), {
        dataTransfer,
      });
      fireEvent.drop(screen.getByLabelText(copy.frameThumbnail(1)), {
        dataTransfer,
      });

      await waitFor(() => {
        expect(reorderFrames).toHaveBeenCalledWith(MATRIX_PROJECT_ID, {
          fromIndex: 3,
          toIndex: 1,
        });
      });
      expect(activeIndexAfterReorder(1, 3, 1)).toBe(2);
      await waitFor(() => {
        expect(useEditorStore.getState().activeFrameIndex).toBe(2);
      });
      expect(cachedMarker(1)).toBe(4);
      expect(cachedMarker(2)).toBe(2);
    });
  });

  describe("race conditions", () => {
    it("[RACE-001] switching frames during playback is ignored", async () => {
      resetAnimationProject({ frameCount: 8, activeFrameIndex: 2 });
      useEditorStore.getState().setPlaying(true);
      render(<BottomFrameStrip />);

      fireEvent.click(screen.getByLabelText(copy.frameThumbnail(5)));
      await useEditorStore.getState().switchFrame(5);

      const state = useEditorStore.getState();
      expect(state.activeFrameIndex).toBe(2);
      expect(state.activeFrameIndex).toBeLessThan(state.frameCount);
      expect(screen.getByLabelText(copy.frameThumbnail(5))).toBeDisabled();
    });

    it("[RACE-002] paint while a frame PUT is in flight", async () => {
      const gate = deferred<void>();
      installFrameCoordinator(async () => {
        await gate.promise;
        return { ok: true };
      });
      resetAnimationProject({ frameCount: 4 });

      paintActiveFrame(3, 3, 6);
      const switching = useEditorStore.getState().switchFrame(1);
      paintActiveFrame(4, 4, 7);
      gate.resolve();
      await switching;

      expect(useEditorStore.getState().activeFrameIndex).toBe(1);
      expect(activePixelAt(0, 0)).toBe(2);
      expect(cachedPixelAt(1, 3, 3)).toBe(0);
      expect(cachedPixelAt(1, 4, 4)).toBe(0);
      expect(cachedPixelAt(0, 3, 3)).toBe(6);
      expect(cachedPixelAt(0, 4, 4)).toBe(7);
    });

    it("[RACE-003] duplicate frames flushes unsaved pixels first", async () => {
      const saveMock = installFrameCoordinator();
      resetAnimationProject({
        frameCount: 1,
        framePixelsByIndex: { 0: framePixels(5) },
        pixels: framePixels(5),
      });
      vi.mocked(duplicateFrames).mockResolvedValue({
        ok: true,
        response: duplicateResponse(8),
      });
      fetchFramesFromMarkers(
        Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, 5])),
      );

      paintActiveFrame(2, 2, 6);

      openDuplicateDialog();
      await confirmDuplicate(8);
      await waitFor(() => {
        expect(useEditorStore.getState().frameCount).toBe(8);
      });

      const savedPixels = saveMock.mock.calls.at(0)?.[2] as Uint8Array | undefined;
      expect(savedPixels?.[2 * GRID_SIZE + 2]).toBe(6);
      expect(
        saveMock.mock.invocationCallOrder[0],
      ).toBeLessThan(
        vi.mocked(duplicateFrames).mock.invocationCallOrder[0]!,
      );
      expect(cachedPixelAt(0, 2, 2)).toBe(6);
    });

    it("[RACE-004] rapid play/pause toggling leaves no stuck read-only", async () => {
      resetAnimationProject({ frameCount: 8 });
      render(<AnimationPlayer />);

      for (let i = 0; i < 5; i++) {
        fireEvent.click(
          screen.getByLabelText(
            useEditorStore.getState().isPlaying
              ? copy.animationPause
              : copy.animationPlay,
          ),
        );
      }

      await waitFor(() => {
        expect(useEditorStore.getState().isPlaying).toBe(true);
      });

      fireEvent.click(await screen.findByLabelText(copy.animationPause));
      await waitFor(() => {
        expect(useEditorStore.getState().isPlaying).toBe(false);
      });
      expect(useEditorStore.getState().readOnly).toBe(false);
      expect(useEditorStore.getState().activeFrameIndex).toBeLessThan(
        useEditorStore.getState().frameCount,
      );
    });

    it("[RACE-005] reorder during a debounced save flushes pixels first", async () => {
      const saveMock = installFrameCoordinator(async () => ({ ok: true }), 500);
      resetAnimationProject({ frameCount: 4, activeFrameIndex: 1 });
      vi.mocked(reorderFrames).mockResolvedValue({
        ok: true,
        response: reorderResponse(4),
      });
      render(<BottomFrameStrip />);

      paintActiveFrame(5, 5, 6);

      const dataTransfer = createDataTransfer();
      fireEvent.dragStart(screen.getByLabelText(copy.frameThumbnail(3)), {
        dataTransfer,
      });
      fireEvent.drop(screen.getByLabelText(copy.frameThumbnail(1)), {
        dataTransfer,
      });

      await waitFor(() => {
        expect(saveMock).toHaveBeenCalled();
      });
      expect(saveMock.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(reorderFrames).mock.invocationCallOrder[0]!,
      );
      expect(saveMock.mock.calls[0]?.[1]).toBe(1);
      await waitFor(() => {
        expect(useEditorStore.getState().activeFrameIndex).toBe(2);
      });
    });
  });

  describe("edge cases", () => {
    it("[EDGE-001] single frame hides the strip", () => {
      resetAnimationProject({ frameCount: 1 });
      const { container } = render(<BottomFrameStrip />);
      expect(container).toBeEmptyDOMElement();
    });

    it("[EDGE-002] duplicate blank leaves other frames empty", async () => {
      resetAnimationProject({
        frameCount: 1,
        framePixelsByIndex: { 0: framePixels(5) },
        pixels: framePixels(5),
      });
      vi.mocked(duplicateFrames).mockResolvedValue({
        ok: true,
        response: duplicateResponse(8),
      });
      fetchFramesFromMarkers();

      openDuplicateDialog();
      fireEvent.click(
        screen.getByRole("button", { name: /Blank other frames/ }),
      );
      await confirmDuplicate(8);

      await waitFor(() => {
        expect(useEditorStore.getState().frameCount).toBe(8);
      });
      expect(duplicateFrames).toHaveBeenCalledWith(MATRIX_PROJECT_ID, {
        frameCount: 8,
        sourceFrameIndex: 0,
        fillMode: "blank",
      });
      expect(cachedMarker(0)).toBe(5);
      for (let index = 1; index < 8; index++) {
        expect(cachedMarker(index)).toBe(0);
      }
    });

    it("[EDGE-003] playback with identical frames cycles cleanly", () => {
      resetAnimationProject({
        frameCount: 8,
        framePixelsByIndex: buildFrameCache(8, { identical: true }),
      });
      useEditorStore.setState({ isPlaying: true, readOnly: true });

      for (let step = 1; step <= 16; step++) {
        expect(() => useEditorStore.getState().advancePlaybackFrame()).not.toThrow();
        expect(useEditorStore.getState().activeFrameIndex).toBe(step % 8);
        expect(activePixelAt(0, 0)).toBe(1);
      }
    });

    it("[EDGE-004] fps clamps to the 1–24 range", () => {
      resetAnimationProject({ frameCount: 8 });
      const { setAnimationFps } = useEditorStore.getState();

      setAnimationFps(1);
      expect(useEditorStore.getState().animationFps).toBe(1);
      setAnimationFps(24);
      expect(useEditorStore.getState().animationFps).toBe(24);
      setAnimationFps(0);
      expect(useEditorStore.getState().animationFps).toBe(1);
      setAnimationFps(99);
      expect(useEditorStore.getState().animationFps).toBe(24);
    });

    it("[EDGE-005] onion skin on frame 0 draws no ghost", () => {
      const restoreBox = stubElementBox();
      try {
        resetAnimationProject({
          frameCount: 8,
          activeFrameIndex: 0,
          onionSkinEnabled: true,
        });
        expect(() => render(<Canvas />)).not.toThrow();
        expect(lastRenderCall()?.onionSkinPixels).toBeUndefined();
      } finally {
        restoreBox();
      }
    });
  });

  describe("error handling", () => {
    it("[ERR-001] duplicate frames API failure keeps the frame count", async () => {
      resetAnimationProject({ frameCount: 1 });
      vi.mocked(duplicateFrames).mockResolvedValue({
        ok: false,
        message: errors.apiDisconnected,
      });

      const onOpenChange = openDuplicateDialog();
      await confirmDuplicate(8);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        errors.apiDisconnected,
      );
      expect(useEditorStore.getState().frameCount).toBe(1);
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("[ERR-002] frame load failure keeps the editor usable", async () => {
      installFrameCoordinator();
      resetAnimationProject({
        frameCount: 4,
        framePixelsByIndex: { 0: framePixels(1) },
        pixels: framePixels(1),
      });
      vi.mocked(fetchFrame).mockResolvedValue({
        ok: false,
        message: errors.apiDisconnected,
      });

      await useEditorStore.getState().switchFrame(3);

      const state = useEditorStore.getState();
      expect(state.activeFrameIndex).toBe(0);
      expect(state.frameSyncStatus).toBe("error");
      expect(state.frameSyncError).toBe(errors.apiDisconnected);
      expect(state.frameSyncError).not.toMatch(/\d{3}/);

      paintActiveFrame(2, 2, 6);
      expect(activePixelAt(2, 2)).toBe(6);
    });

    it("[ERR-003] failed reorder rolls back and notifies", async () => {
      resetAnimationProject({ frameCount: 4, activeFrameIndex: 1 });
      vi.mocked(reorderFrames).mockResolvedValue({
        ok: false,
        message: errors.apiDisconnected,
      });
      render(<BottomFrameStrip />);

      const dataTransfer = createDataTransfer();
      fireEvent.dragStart(screen.getByLabelText(copy.frameThumbnail(3)), {
        dataTransfer,
      });
      fireEvent.drop(screen.getByLabelText(copy.frameThumbnail(1)), {
        dataTransfer,
      });

      await waitFor(() => {
        expect(useEditorStore.getState().frameSyncStatus).toBe("error");
      });
      const state = useEditorStore.getState();
      expect(state.frameSyncError).toBe(errors.apiDisconnected);
      expect(state.activeFrameIndex).toBe(1);
      expect(cachedMarker(1)).toBe(2);
      expect(cachedMarker(3)).toBe(4);
      expect(fetchFrame).not.toHaveBeenCalled();
    });
  });
});
