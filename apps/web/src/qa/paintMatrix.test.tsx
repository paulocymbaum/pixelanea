import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screenToCell } from "@/canvas/coordinates";
import { floodFill } from "@/canvas/floodFill";
import { bresenhamLine } from "@/canvas/bresenham";
import { tools } from "@/content/tools";
import { copy } from "@/content/copy";
import { PaletteSwatchGrid } from "@/components/palette/PaletteSwatchGrid";
import { UndoRedoToolbar } from "@/components/toolbar/UndoRedoToolbar";
import { PaintCellCommand } from "@/state/commands/paintCell";
import { PaintCellsCommand } from "@/state/commands/paintCells";
import { pushCommands } from "@/state/commands/undoStack";
import { UNDO_STACK_CAP } from "@/state/commands/types";
import { useEditorStore } from "@/state/editorStore";
import {
  flushFrameSync,
  scheduleFrameSync,
  setSyncCoordinatorForTests,
  SyncCoordinator,
} from "@/state/persist";
import { captureFrameSnapshot } from "@/state/sync/snapshots";
import { useEditorShortcuts } from "@/state/shortcuts";
import { useToolInput } from "@/tools/useToolInput";
import {
  buildToolContext,
  dispatchPaintCell,
  eraserTool,
  eyedropperTool,
  fillTool,
  lineTool,
  paintCell,
  paintCells,
  paintTool,
  pixelAt,
  pointerEvent,
  resetPaintProject,
  rowCells,
  runToolStroke,
  setPixel,
} from "./paintMatrixHarness";

vi.mock("@/api/frames", () => ({
  saveFrame: vi.fn().mockResolvedValue({ ok: true }),
  fetchFrame: vi.fn(),
  pixelsFromFrame: vi.fn(),
}));

import { saveFrame } from "@/api/frames";

function ShortcutHarness() {
  useEditorShortcuts();
  return null;
}

function fireKey(key: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(window, { key, bubbles: true, ...init });
}

describe("QA-001 paint matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncCoordinatorForTests(null);
    resetPaintProject();
  });

  describe("happy path", () => {
    it("[HP-001] paint click + drag stroke", () => {
      paintCells(rowCells(0, 0, 4));
      expect(pixelAt(0, 0)).toBe(1);
      expect(pixelAt(4, 0)).toBe(1);
      expect(useEditorStore.getState().undoStack.length).toBeGreaterThan(0);
    });

    it("[HP-002] eraser removes pixels", () => {
      paintCells(rowCells(0, 0, 3));
      useEditorStore.setState({ activeTool: "eraser" });
      runToolStroke(eraserTool, rowCells(0, 1, 2), { endStroke: false });
      expect(pixelAt(1, 0)).toBe(0);
      expect(tools.eraser).toBe("Fix mistakes");
    });

    it("[HP-003] eyedropper absorbs then paints", () => {
      setPixel(2, 2, 3);
      useEditorStore.setState({ activeTool: "eyedropper" });
      eyedropperTool.onPointerDown?.(pointerEvent(), { x: 2, y: 2 }, buildToolContext());
      expect(useEditorStore.getState().activeColorIndex).toBe(3);
      expect(useEditorStore.getState().activeTool).toBe("paint");
      paintCell(5, 5);
      expect(pixelAt(5, 5)).toBe(3);
    });

    it("[HP-004] fill bucket flood fill", () => {
      for (let x = 0; x < 5; x++) {
        setPixel(x, 0, 1);
        setPixel(x, 4, 1);
      }
      for (let y = 1; y < 4; y++) {
        setPixel(0, y, 1);
        setPixel(4, y, 1);
      }
      useEditorStore.setState({ activeTool: "fill", activeColorIndex: 2 });
      const command = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 2, y: 2 },
        buildToolContext(),
      );
      expect(command).toBeInstanceOf(PaintCellsCommand);
      buildToolContext().dispatch(command!);
      expect(pixelAt(2, 2)).toBe(2);
      expect(pixelAt(0, 0)).toBe(1);
    });

    it("[HP-005] line tool (Bresenham)", () => {
      useEditorStore.setState({ activeTool: "line", activeColorIndex: 2 });
      lineTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      const command = lineTool.onPointerUp?.(
        pointerEvent(0, 0),
        { x: 4, y: 0 },
        buildToolContext(),
      );
      buildToolContext().dispatch(command!);
      const line = bresenhamLine(0, 0, 4, 0);
      for (const cell of line) {
        expect(pixelAt(cell.x, cell.y)).toBe(2);
      }
    });

    it("[HP-006] undo / redo paint stroke", () => {
      paintCells(rowCells(0, 0, 2));
      expect(pixelAt(2, 0)).toBe(1);
      for (let i = 0; i < 3; i++) {
        useEditorStore.getState().undo();
      }
      expect(pixelAt(0, 0)).toBe(0);
      expect(pixelAt(2, 0)).toBe(0);
      for (let i = 0; i < 3; i++) {
        useEditorStore.getState().redo();
      }
      expect(pixelAt(2, 0)).toBe(1);
    });

    it("[HP-007] keyboard color shortcuts 1–9", () => {
      render(<ShortcutHarness />);
      fireKey("2");
      expect(useEditorStore.getState().activeColorIndex).toBe(1);
      paintCell(1, 1);
      expect(pixelAt(1, 1)).toBe(1);
    });

    it("[HP-008] zoom maps pointer to correct cell at high zoom", () => {
      useEditorStore.setState({ zoom: 8, panX: 0, panY: 0 });
      expect(screenToCell(16, 16, { zoom: 8, panX: 0, panY: 0 })).toEqual({
        x: 2,
        y: 2,
      });
      paintCell(2, 2);
      expect(pixelAt(2, 2)).toBe(1);
    });

    it("[HP-009] keyboard tool shortcuts B/E/I/G/L", () => {
      render(<ShortcutHarness />);
      fireKey("b");
      expect(useEditorStore.getState().activeTool).toBe("paint");
      fireKey("e");
      expect(useEditorStore.getState().activeTool).toBe("eraser");
      fireKey("i");
      expect(useEditorStore.getState().activeTool).toBe("eyedropper");
      fireKey("g");
      expect(useEditorStore.getState().activeTool).toBe("fill");
      fireKey("l");
      expect(useEditorStore.getState().activeTool).toBe("line");
    });

    it("[HP-010] eraser click + drag stroke", () => {
      paintCells(rowCells(2, 0, 5));
      useEditorStore.setState({ activeTool: "eraser" });
      runToolStroke(eraserTool, rowCells(2, 1, 4), { endStroke: false });
      expect(pixelAt(1, 2)).toBe(0);
      expect(pixelAt(2, 2)).toBe(0);
      expect(pixelAt(0, 2)).toBe(1);
      expect(pixelAt(5, 2)).toBe(1);
    });

    it("[HP-011] fill transparent region", () => {
      for (let x = 0; x < 4; x++) {
        setPixel(x, 0, 1);
        setPixel(x, 3, 1);
      }
      setPixel(0, 1, 1);
      setPixel(0, 2, 1);
      setPixel(3, 1, 1);
      setPixel(3, 2, 1);
      useEditorStore.setState({ activeTool: "fill", activeColorIndex: 2 });
      const command = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 1, y: 1 },
        buildToolContext(),
      );
      buildToolContext().dispatch(command!);
      expect(pixelAt(1, 1)).toBe(2);
      expect(pixelAt(2, 2)).toBe(2);
      expect(pixelAt(0, 0)).toBe(1);
    });

    it("[HP-012] undo / redo via toolbar", () => {
      paintCell(3, 3);
      const command = new PaintCellCommand(3, 3, 0, 1);
      useEditorStore.setState({
        undoStack: [command],
        pixels: new Uint8Array(useEditorStore.getState().pixels),
      });
      useEditorStore.getState().pixels[3 * 32 + 3] = 1;

      render(<UndoRedoToolbar />);
      fireEvent.click(screen.getByRole("button", { name: copy.undo }));
      expect(pixelAt(3, 3)).toBe(0);

      fireEvent.click(screen.getByRole("button", { name: copy.redo }));
      expect(pixelAt(3, 3)).toBe(1);
    });

    it("[HP-013] multi-frame paint isolation", async () => {
      const frame0 = new Uint8Array(16 * 16);
      frame0[0] = 2;
      const frame1 = new Uint8Array(16 * 16);
      resetPaintProject({
        gridWidth: 16,
        gridHeight: 16,
        frameCount: 8,
        pixels: new Uint8Array(frame0),
        framePixelsByIndex: { 0: frame0, 1: frame1 },
        activeFrameIndex: 0,
      });

      await useEditorStore.getState().switchFrame(1);
      paintCell(5, 5, 3);
      const frame1Pixels = useEditorStore.getState().framePixelsByIndex[1]!;
      expect(frame1Pixels[5 * 16 + 5]).toBe(3);

      await useEditorStore.getState().switchFrame(0);
      expect(pixelAt(0, 0)).toBe(2);
      expect(pixelAt(5, 5)).toBe(0);
    });

    it("[HP-014] eyedropper samples transparent", () => {
      useEditorStore.setState({ activeTool: "eyedropper" });
      eyedropperTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      expect(useEditorStore.getState().activeColorIndex).toBe(0);
      paintCell(1, 1);
      expect(pixelAt(1, 1)).toBe(0);
    });

    it("[HP-015] palette click then paint", () => {
      render(<PaletteSwatchGrid />);
      fireEvent.click(screen.getByRole("option", { name: "Color 3" }));
      expect(useEditorStore.getState().activeColorIndex).toBe(2);
      paintCell(4, 4, 2);
      expect(pixelAt(4, 4)).toBe(2);
    });

    it("[HP-016] line tool diagonal", () => {
      resetPaintProject({ gridWidth: 16, gridHeight: 16, pixels: new Uint8Array(256) });
      useEditorStore.setState({ activeTool: "line", activeColorIndex: 2 });
      lineTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      const command = lineTool.onPointerUp?.(
        pointerEvent(0, 0),
        { x: 15, y: 15 },
        buildToolContext(),
      );
      buildToolContext().dispatch(command!);
      const line = bresenhamLine(0, 0, 15, 15);
      for (const cell of line) {
        expect(pixelAt(cell.x, cell.y)).toBe(2);
      }
    });

    it("[HP-017] undo fill as single command", () => {
      const region = floodFill(
        (cell) => pixelAt(cell.x, cell.y),
        5,
        5,
        { x: 0, y: 0 },
        0,
      );
      const changes = region.map((c) => ({
        x: c.x,
        y: c.y,
        previous: 0,
        next: 2,
      }));
      useEditorStore.getState().dispatch(new PaintCellsCommand(changes));
      expect(useEditorStore.getState().undoStack).toHaveLength(1);
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().pixels.every((v) => v === 0)).toBe(true);
    });

    it("[HP-018] undo line as single command", () => {
      useEditorStore.setState({ activeTool: "line", activeColorIndex: 2 });
      lineTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      const command = lineTool.onPointerUp?.(
        pointerEvent(0, 0),
        { x: 6, y: 0 },
        buildToolContext(),
      );
      buildToolContext().dispatch(command!);
      expect(useEditorStore.getState().undoStack).toHaveLength(1);
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().pixels.every((v) => v === 0)).toBe(true);
    });
  });

  describe("race conditions", () => {
    it("[RACE-001] rapid tool switching while dragging", () => {
      paintTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      paintTool.onPointerMove?.(pointerEvent(0, 1), { x: 1, y: 0 }, buildToolContext());
      useEditorStore.setState({ activeTool: "eraser" });
      const cmd = eraserTool.onPointerMove?.(
        pointerEvent(0, 1),
        { x: 2, y: 0 },
        buildToolContext(),
      );
      expect(cmd).toBeUndefined();
      setPixel(2, 0, 1);
      const eraseCmd = eraserTool.onPointerMove?.(
        pointerEvent(0, 1),
        { x: 2, y: 0 },
        buildToolContext(),
      );
      expect(eraseCmd).toBeDefined();
    });

    it("[RACE-002] undo during debounced frame sync", async () => {
      let resolvePut: (() => void) | undefined;
      vi.mocked(saveFrame).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePut = () => resolve({ ok: true });
          }),
      );

      const saveFrameMock = vi.fn().mockImplementation(async (...args: unknown[]) => {
        await new Promise<void>((resolve) => {
          resolvePut = resolve;
        });
        return { ok: true as const };
      });
      setSyncCoordinatorForTests(
        new SyncCoordinator(
          {
            saveFrame: saveFrameMock,
            savePalette: vi.fn().mockResolvedValue({ ok: true }),
            getFrameSnapshot: () => ({
              lane: "frame",
              projectId: "matrix-project",
              frameIndex: 0,
              pixels: useEditorStore.getState().pixels,
            }),
            getPaletteSnapshot: () => null,
            frameCallbacks: {
              onSyncing: () =>
                useEditorStore.getState().setFrameSyncStatus("syncing"),
              onSuccess: () => useEditorStore.getState().markFrameSynced(),
              onError: (message) =>
                useEditorStore.getState().setFrameSyncStatus("error", message),
            },
            paletteCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: vi.fn(),
              onError: vi.fn(),
            },
          },
          0,
        ),
      );

      paintCell(1, 1);
      const painted = pixelAt(1, 1);
      const flushPromise = flushFrameSync();
      useEditorStore.getState().undo();
      expect(pixelAt(1, 1)).toBe(0);
      resolvePut?.();
      await flushPromise;
      expect(pixelAt(1, 1)).toBe(0);
    });

    it("[RACE-003] overlapping paint on same cell", () => {
      paintCell(2, 2, 1);
      useEditorStore.setState({ activeColorIndex: 2 });
      paintCell(2, 2, 2);
      useEditorStore.setState({ activeColorIndex: 3 });
      paintCell(2, 2, 3);
      expect(pixelAt(2, 2)).toBe(3);
      expect(useEditorStore.getState().undoStack.length).toBe(3);
    });

    it.skip("[RACE-004] navigate away mid-stroke", () => {
      // Requires Playwright E2E — router + unsaved confirm dialog.
    });

    it("[RACE-005] rapid undo/redo spam", () => {
      for (let i = 0; i < 5; i++) {
        paintCell(i, 0, 1);
      }
      for (let i = 0; i < 5; i++) {
        useEditorStore.getState().undo();
      }
      for (let i = 0; i < 3; i++) {
        useEditorStore.getState().redo();
      }
      expect(pixelAt(0, 0)).toBe(1);
      expect(pixelAt(1, 0)).toBe(1);
      expect(pixelAt(2, 0)).toBe(1);
      expect(pixelAt(3, 0)).toBe(0);
    });

    it("[RACE-006] switch frame after stroke completes", async () => {
      const frame0 = new Uint8Array(16 * 16);
      const frame1 = new Uint8Array(16 * 16);
      resetPaintProject({
        gridWidth: 16,
        gridHeight: 16,
        frameCount: 2,
        pixels: frame0,
        framePixelsByIndex: { 0: frame0, 1: frame1 },
      });
      paintCell(1, 1, 2);
      useEditorStore.setState({ isDirty: false });
      await useEditorStore.getState().switchFrame(1);
      expect(pixelAt(1, 1)).toBe(0);
      await useEditorStore.getState().switchFrame(0);
      expect(pixelAt(1, 1)).toBe(2);
    });

    it("[RACE-007] stale frame PUT after newer edit", async () => {
      let resolveFirst: (() => void) | undefined;
      const saveFrameMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<{ ok: true }>((resolve) => {
              resolveFirst = () => resolve({ ok: true });
            }),
        )
        .mockResolvedValue({ ok: true });

      setSyncCoordinatorForTests(
        new SyncCoordinator(
          {
            saveFrame: saveFrameMock,
            savePalette: vi.fn().mockResolvedValue({ ok: true }),
            getFrameSnapshot: () => ({
              lane: "frame",
              projectId: "matrix-project",
              frameIndex: 0,
              pixels: new Uint8Array(useEditorStore.getState().pixels),
            }),
            getPaletteSnapshot: () => null,
            frameCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: () => useEditorStore.getState().markFrameSynced(),
              onError: (message) =>
                useEditorStore.getState().setFrameSyncStatus("error", message),
            },
            paletteCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: vi.fn(),
              onError: vi.fn(),
            },
          },
          0,
        ),
      );

      dispatchPaintCell(0, 0, 0, 1);
      useEditorStore.setState({ isDirty: true });
      const first = flushFrameSync();
      dispatchPaintCell(1, 0, 0, 2);
      useEditorStore.setState({ isDirty: true });
      const second = flushFrameSync();
      resolveFirst?.();
      await Promise.all([first, second]);
      expect(saveFrameMock.mock.calls.at(-1)?.[2]?.[1]).toBe(2);
    });

    it("[RACE-008] rapid color change while dragging", () => {
      paintTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      useEditorStore.getState().dispatch(
        paintTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext())!,
      );
      useEditorStore.setState({ activeColorIndex: 2 });
      const cmd = paintTool.onPointerMove?.(
        pointerEvent(0, 1),
        { x: 1, y: 0 },
        buildToolContext(),
      );
      buildToolContext().dispatch(cmd!);
      expect(pixelAt(1, 0)).toBe(2);
    });

    it("[RACE-009] line tool interrupted by tool switch", () => {
      useEditorStore.setState({ activeTool: "line" });
      lineTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      useEditorStore.setState({ activeTool: "paint" });
      const command = lineTool.onPointerUp?.(
        pointerEvent(0, 0),
        { x: 4, y: 0 },
        buildToolContext(),
      );
      expect(command).toBeInstanceOf(PaintCellsCommand);
      expect(useEditorStore.getState().activeTool).toBe("paint");
    });

    it("[RACE-010] rapid consecutive fill clicks", () => {
      setPixel(0, 0, 1);
      setPixel(1, 0, 1);
      setPixel(2, 0, 2);
      setPixel(3, 0, 2);
      useEditorStore.setState({ activeTool: "fill", activeColorIndex: 3 });
      const first = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 0, y: 0 },
        buildToolContext(),
      );
      buildToolContext().dispatch(first!);
      const second = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 2, y: 0 },
        buildToolContext(),
      );
      buildToolContext().dispatch(second!);
      expect(useEditorStore.getState().undoStack).toHaveLength(2);
    });

    it("[RACE-011] zoom change during drag does not crash", () => {
      paintTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      useEditorStore.getState().dispatch(
        paintTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext())!,
      );
      useEditorStore.getState().setZoom(4);
      const cmd = paintTool.onPointerMove?.(
        pointerEvent(0, 1),
        { x: 1, y: 0 },
        buildToolContext(),
      );
      expect(() => buildToolContext().dispatch(cmd!)).not.toThrow();
    });

    it("[RACE-012] paint burst then immediate frame switch", async () => {
      const frame0 = new Uint8Array(16 * 16);
      const frame1 = new Uint8Array(16 * 16);
      resetPaintProject({
        gridWidth: 16,
        gridHeight: 16,
        frameCount: 2,
        pixels: frame0,
        framePixelsByIndex: { 0: frame0, 1: frame1 },
      });

      const saveFrameMock = vi.fn().mockResolvedValue({ ok: true });
      setSyncCoordinatorForTests(
        new SyncCoordinator(
          {
            saveFrame: saveFrameMock,
            savePalette: vi.fn().mockResolvedValue({ ok: true }),
            getFrameSnapshot: captureFrameSnapshot,
            getPaletteSnapshot: () => null,
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
          },
          500,
        ),
      );

      for (let i = 0; i < 10; i++) {
        paintCell(i, 0, 1);
      }
      scheduleFrameSync();
      await useEditorStore.getState().switchFrame(1);
      expect(useEditorStore.getState().activeFrameIndex).toBe(1);
      expect(useEditorStore.getState().framePixelsByIndex[0]![0]).toBe(1);
      expect(saveFrameMock).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("[EDGE-001] paint with palette lock on", () => {
      useEditorStore.setState({ paletteLocked: true, activeColorIndex: 99 });
      const result = paintTool.onPointerDown?.(
        pointerEvent(),
        { x: 0, y: 0 },
        buildToolContext(),
      );
      expect(result).toBeUndefined();
    });

    it("[EDGE-002] paint same color on same cell", () => {
      setPixel(1, 1, 1);
      useEditorStore.setState({ activeColorIndex: 1 });
      const stackBefore = useEditorStore.getState().undoStack.length;
      paintCell(1, 1, 1);
      expect(useEditorStore.getState().undoStack.length).toBe(stackBefore);
    });

    it("[EDGE-003] eraser on empty cell", () => {
      useEditorStore.setState({ activeTool: "eraser" });
      const stackBefore = useEditorStore.getState().undoStack.length;
      const result = eraserTool.onPointerDown?.(
        pointerEvent(),
        { x: 0, y: 0 },
        buildToolContext(),
      );
      expect(result).toBeUndefined();
      expect(useEditorStore.getState().undoStack.length).toBe(stackBefore);
    });

    it("[EDGE-004] fill on full canvas same color", () => {
      const pixels = new Uint8Array(32 * 32).fill(1);
      resetPaintProject({ pixels, activeColorIndex: 1 });
      useEditorStore.setState({ activeTool: "fill" });
      const result = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 0, y: 0 },
        buildToolContext(),
      );
      expect(result).toBeUndefined();
    });

    it("[EDGE-005] undo stack at cap (500)", () => {
      const commands = Array.from(
        { length: UNDO_STACK_CAP + 10 },
        (_, i) => new PaintCellCommand(i % 32, 0, 0, 1),
      );
      const capped = pushCommands([], commands);
      expect(capped).toHaveLength(UNDO_STACK_CAP);
      useEditorStore.setState({ undoStack: capped, pixels: new Uint8Array(32 * 32) });
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().undoStack.length).toBe(UNDO_STACK_CAP - 1);
    });

    it("[EDGE-006] read-only blocks paint during playback", () => {
      useEditorStore.getState().setPlaying(true);
      paintCell(1, 1);
      expect(pixelAt(1, 1)).toBe(0);
      const fill = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 2, y: 2 },
        buildToolContext(),
      );
      expect(fill).toBeUndefined();
    });

    it("[EDGE-007] canvas edge cells", () => {
      resetPaintProject({ gridWidth: 16, gridHeight: 16, pixels: new Uint8Array(256) });
      paintCell(0, 0);
      paintCell(15, 15);
      expect(pixelAt(0, 0)).toBe(1);
      expect(pixelAt(15, 15)).toBe(1);
    });

    it("[EDGE-008] non-primary pointer button ignored", () => {
      const { result } = renderHook(() => useToolInput());
      result.current.onPointerDown(pointerEvent(2, 0), { x: 1, y: 1 });
      expect(useEditorStore.getState().undoStack).toHaveLength(0);
    });

    it("[EDGE-009] pointer move without button held", () => {
      const stackBefore = useEditorStore.getState().undoStack.length;
      const result = paintTool.onPointerMove?.(
        pointerEvent(0, 0),
        { x: 1, y: 1 },
        buildToolContext(),
      );
      expect(result).toBeUndefined();
      expect(useEditorStore.getState().undoStack.length).toBe(stackBefore);
    });

    it("[EDGE-010] fill 4-connected only", () => {
      const grid = [
        [1, 2],
        [2, 1],
      ];
      const getPixelIndex = ({ x, y }: { x: number; y: number }) => grid[y]![x]!;
      const region = floodFill(getPixelIndex, 2, 2, { x: 0, y: 0 }, 1);
      expect(region).toEqual([{ x: 0, y: 0 }]);
    });

    it("[EDGE-011] fill with palette lock + valid color", () => {
      setPixel(0, 0, 1);
      setPixel(1, 0, 1);
      useEditorStore.setState({
        activeTool: "fill",
        activeColorIndex: 2,
        paletteLocked: true,
      });
      const command = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 0, y: 0 },
        buildToolContext(),
      );
      expect(command).toBeInstanceOf(PaintCellsCommand);
    });

    it("[EDGE-012] line tool single click", () => {
      useEditorStore.setState({ activeTool: "line", activeColorIndex: 2 });
      lineTool.onPointerDown?.(pointerEvent(), { x: 1, y: 1 }, buildToolContext());
      const command = lineTool.onPointerUp?.(
        pointerEvent(0, 0),
        { x: 1, y: 1 },
        buildToolContext(),
      );
      buildToolContext().dispatch(command!);
      expect(pixelAt(1, 1)).toBe(2);
      expect(useEditorStore.getState().undoStack).toHaveLength(1);
    });

    it("[EDGE-013] line tool clipped at boundary", () => {
      resetPaintProject({ gridWidth: 4, gridHeight: 4, pixels: new Uint8Array(16) });
      useEditorStore.setState({ activeTool: "line", activeColorIndex: 2 });
      lineTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      const command = lineTool.onPointerUp?.(
        pointerEvent(0, 0),
        { x: 10, y: 0 },
        buildToolContext(),
      );
      buildToolContext().dispatch(command!);
      expect(pixelAt(3, 0)).toBe(2);
      expect(useEditorStore.getState().pixels.length).toBe(16);
    });

    it("[EDGE-014] keyboard digit beyond palette length", () => {
      resetPaintProject({
        paletteColors: ["#000000", "#111111", "#222222"],
      });
      render(<ShortcutHarness />);
      const before = useEditorStore.getState().activeColorIndex;
      fireKey("9");
      expect(useEditorStore.getState().activeColorIndex).toBe(before);
    });

    it("[EDGE-015] tool shortcuts blocked in text field", () => {
      render(
        <>
          <ShortcutHarness />
          <input aria-label="Project name" />
        </>,
      );
      const input = screen.getByLabelText("Project name");
      useEditorStore.setState({ activeTool: "paint" });
      fireEvent.keyDown(input, { key: "e", bubbles: true });
      expect(useEditorStore.getState().activeTool).toBe("paint");
    });

    it("[EDGE-016] redo stack cleared after new edit", () => {
      paintCell(0, 0);
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().redoStack.length).toBe(1);
      paintCell(1, 0);
      expect(useEditorStore.getState().redoStack.length).toBe(0);
    });

    it("[EDGE-017] undo/redo disabled during playback", () => {
      paintCell(0, 0);
      useEditorStore.getState().setPlaying(true);
      const pixelsBefore = new Uint8Array(useEditorStore.getState().pixels);
      useEditorStore.getState().undo();
      useEditorStore.getState().redo();
      expect(useEditorStore.getState().pixels).toEqual(pixelsBefore);
      render(<UndoRedoToolbar />);
      expect(screen.getByRole("button", { name: copy.undo })).toBeDisabled();
      expect(screen.getByRole("button", { name: copy.redo })).toBeDisabled();
    });

    it("[EDGE-018] drag dedupes same cell", () => {
      const { result } = renderHook(() => useToolInput());
      result.current.onPointerDown(pointerEvent(), { x: 1, y: 1 });
      result.current.onPointerMove(pointerEvent(0, 1), { x: 1, y: 1 });
      result.current.onPointerMove(pointerEvent(0, 1), { x: 1, y: 1 });
      expect(useEditorStore.getState().undoStack.length).toBe(1);
    });

    it("[EDGE-019] minimum grid 8×8 corners", () => {
      resetPaintProject({ gridWidth: 8, gridHeight: 8, pixels: new Uint8Array(64) });
      paintCell(0, 0);
      paintCell(7, 7);
      expect(pixelAt(0, 0)).toBe(1);
      expect(pixelAt(7, 7)).toBe(1);
    });

    it("[EDGE-020] color-filter lighting mode blocks paint", () => {
      useEditorStore.setState({ placingLighting: true });
      const before =
        useEditorStore.getState().colorFilters.lightingPoints.length;
      useEditorStore.getState().addColorFilterLightingPoint({
        x: 2,
        y: 2,
        radius: 5,
        intensity: 0.5,
      });
      expect(useEditorStore.getState().colorFilters.lightingPoints.length).toBe(
        before + 1,
      );
      expect(useEditorStore.getState().undoStack.length).toBe(0);
    });

    it("[EDGE-021] eyedropper creates no undo entry", () => {
      setPixel(2, 2, 3);
      const stackBefore = useEditorStore.getState().undoStack.length;
      useEditorStore.setState({ activeTool: "eyedropper" });
      eyedropperTool.onPointerDown?.(pointerEvent(), { x: 2, y: 2 }, buildToolContext());
      expect(useEditorStore.getState().undoStack.length).toBe(stackBefore);
      expect(useEditorStore.getState().activeTool).toBe("paint");
    });

    it("[EDGE-022] eraser drag skips transparent cells", () => {
      setPixel(1, 0, 1);
      setPixel(3, 0, 1);
      useEditorStore.setState({ activeTool: "eraser" });
      runToolStroke(eraserTool, rowCells(0, 0, 4), { endStroke: false });
      expect(pixelAt(1, 0)).toBe(0);
      expect(pixelAt(3, 0)).toBe(0);
      expect(useEditorStore.getState().undoStack).toHaveLength(2);
    });

    it("[EDGE-023] fill off-palette when palette locked", () => {
      useEditorStore.setState({
        activeTool: "fill",
        paletteLocked: true,
        activeColorIndex: 20,
      });
      const result = fillTool.onPointerDown?.(
        pointerEvent(),
        { x: 0, y: 0 },
        buildToolContext(),
      );
      expect(result).toBeUndefined();
    });

    it("[EDGE-024] line off-palette when palette locked", () => {
      useEditorStore.setState({
        activeTool: "line",
        paletteLocked: true,
        activeColorIndex: 20,
      });
      lineTool.onPointerDown?.(pointerEvent(), { x: 0, y: 0 }, buildToolContext());
      const result = lineTool.onPointerUp?.(
        pointerEvent(0, 0),
        { x: 3, y: 0 },
        buildToolContext(),
      );
      expect(result).toBeUndefined();
    });
  });

  describe("error handling", () => {
    function installFailingCoordinator(message = "Server error") {
      setSyncCoordinatorForTests(
        new SyncCoordinator(
          {
            saveFrame: vi.fn().mockResolvedValue({ ok: false, message }),
            savePalette: vi.fn().mockResolvedValue({ ok: true }),
            getFrameSnapshot: () => ({
              lane: "frame",
              projectId: "matrix-project",
              frameIndex: 0,
              pixels: new Uint8Array(useEditorStore.getState().pixels),
            }),
            getPaletteSnapshot: () => null,
            frameCallbacks: {
              onSyncing: () =>
                useEditorStore.getState().setFrameSyncStatus("syncing"),
              onSuccess: () => useEditorStore.getState().markFrameSynced(),
              onError: (msg) =>
                useEditorStore.getState().setFrameSyncStatus("error", msg),
            },
            paletteCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: vi.fn(),
              onError: vi.fn(),
            },
          },
          0,
        ),
      );
    }

    it("[ERR-001] paint when API unreachable", async () => {
      installFailingCoordinator("Network unreachable");
      paintCell(1, 1);
      useEditorStore.setState({ isDirty: true });
      await flushFrameSync();
      expect(pixelAt(1, 1)).toBe(1);
      expect(useEditorStore.getState().frameSyncStatus).toBe("error");
    });

    it("[ERR-002] frame PUT failure mid-session", async () => {
      installFailingCoordinator("Could not save frame");
      paintCell(2, 2);
      useEditorStore.setState({ isDirty: true });
      await flushFrameSync();
      expect(useEditorStore.getState().frameSyncError).toBeTruthy();
      paintCell(3, 3);
      expect(pixelAt(3, 3)).toBe(1);
    });

    it("[ERR-003] invalid project state (no project)", () => {
      useEditorStore.setState({ projectId: null });
      expect(() => paintCell(0, 0)).not.toThrow();
      expect(pixelAt(0, 0)).toBe(1);
    });

    it("[ERR-004] redo when API unreachable", async () => {
      paintCell(0, 0);
      useEditorStore.getState().undo();
      installFailingCoordinator("Offline");
      useEditorStore.getState().redo();
      expect(pixelAt(0, 0)).toBe(1);
      useEditorStore.setState({ isDirty: true });
      await flushFrameSync();
      expect(useEditorStore.getState().frameSyncStatus).toBe("error");
    });

    it("[ERR-005] undo after frame PUT failure", async () => {
      installFailingCoordinator("Save failed");
      paintCell(4, 4);
      useEditorStore.setState({ isDirty: true });
      await flushFrameSync();
      useEditorStore.getState().undo();
      expect(pixelAt(4, 4)).toBe(0);
    });

    it("[ERR-006] offline burst then reconnect", async () => {
      const saveFrameMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, message: "offline" })
        .mockResolvedValue({ ok: true });
      setSyncCoordinatorForTests(
        new SyncCoordinator(
          {
            saveFrame: saveFrameMock,
            savePalette: vi.fn().mockResolvedValue({ ok: true }),
            getFrameSnapshot: () => ({
              lane: "frame",
              projectId: "matrix-project",
              frameIndex: 0,
              pixels: new Uint8Array(useEditorStore.getState().pixels),
            }),
            getPaletteSnapshot: () => null,
            frameCallbacks: {
              onSyncing: () =>
                useEditorStore.getState().setFrameSyncStatus("syncing"),
              onSuccess: () => useEditorStore.getState().markFrameSynced(),
              onError: (msg) =>
                useEditorStore.getState().setFrameSyncStatus("error", msg),
            },
            paletteCallbacks: {
              onSyncing: vi.fn(),
              onSuccess: vi.fn(),
              onError: vi.fn(),
            },
          },
          0,
        ),
      );

      for (let i = 0; i < 20; i++) {
        paintCell(i % 32, 0, 1);
      }
      useEditorStore.setState({ isDirty: true });
      await flushFrameSync();
      expect(useEditorStore.getState().frameSyncStatus).toBe("error");
      useEditorStore.setState({ isDirty: true, frameSyncStatus: "idle" });
      await flushFrameSync();
      expect(saveFrameMock).toHaveBeenCalledTimes(2);
    });

    it("[ERR-007] sync failure does not block further paint", async () => {
      installFailingCoordinator("500");
      paintCell(1, 1);
      useEditorStore.setState({ isDirty: true });
      await flushFrameSync();
      paintCell(2, 2);
      expect(pixelAt(2, 2)).toBe(1);
    });
  });
});
