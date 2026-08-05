import { features } from "@/content/features";
import { resolveOnionSkinFrameIndex } from "@/canvas/onionSkin";
import { hasActiveColorFilters } from "@/lib/colorFilters";
import type { LightingPoint } from "@/lib/colorFilters";
import {
  useEditorStore,
  useOnionSkinEnabled,
} from "@/state/editorStore";
import { useViewportStore } from "@/state/viewportStore";
import {
  getStrokePreviewChanges,
  mergeStrokePreviewIntoPixels,
} from "@/tools/strokePreview";
import { useCallback, useEffect, useRef } from "react";
import {
  buildClipboardPreviewByKey,
  buildMovePreviewByKey,
  clipboardPreviewCellKeys,
  drawSelectionOutline,
  movePreviewAffectedCellKeys,
  readCanvasTokens,
  renderGrid,
  repaintGridCells,
  setupHiDpiCanvas,
} from "./renderer";
import {
  useSelection,
  useSelectionPreview,
  usePastePreview,
  useMovePreview,
} from "@/state/editorStore";

export type CanvasRenderState = {
  activeTool: import("@/tools/registry").ToolId;
  readOnly: boolean;
  gridWidth: number;
  gridHeight: number;
  committedPixels: Uint8Array | null;
  paletteColors: readonly string[];
  frameCount: number;
  activeFrameIndex: number;
  framePixelsByIndex: Record<number, Uint8Array>;
  onionSkinEnabled: boolean;
  onionSkinOpacity: number;
  playbackDirection: 1 | -1;
  colorFilters: import("@/lib/colorFilters").ColorFilterSettings;
  placingLighting: boolean;
  isPlaying: boolean;
  isStrokeActive: boolean;
  strokePreviewTick: number;
  selection: import("@/canvas/selectionGeometry").SelectionRect | null;
  selectionPreview: import("@/canvas/selectionGeometry").SelectionRect | null;
  pastePreview: import("@/state/editorStorePaste").PastePreview | null;
  movePreview: import("@/state/editorStoreMove").MovePreview | null;
  setHoverCell: (cell: import("@/canvas/coordinates").CellCoord | null) => void;
  fitToView: ReturnType<typeof useViewportStore.getState>["fitToView"];
  addColorFilterLightingPoint: (
    point: Omit<LightingPoint, "id">,
  ) => void;
};

/** Narrow store subscriptions for canvas rendering (viewport + grid slices). */
export function useCanvasRenderState(): CanvasRenderState {
  const activeTool = useEditorStore((s) => s.activeTool);
  const readOnly = useEditorStore((s) => s.readOnly);
  const gridWidth = useEditorStore((s) => s.gridWidth);
  const gridHeight = useEditorStore((s) => s.gridHeight);
  const committedPixels = useEditorStore((s) =>
    s.isStrokeActive ? null : s.pixels,
  );
  const paletteColors = useEditorStore((s) => s.paletteColors);
  const frameCount = useEditorStore((s) => s.frameCount);
  const activeFrameIndex = useEditorStore((s) => s.activeFrameIndex);
  const framePixelsByIndex = useEditorStore((s) => s.framePixelsByIndex);
  const onionSkinEnabled = useOnionSkinEnabled();
  const onionSkinOpacity = useEditorStore((s) => s.onionSkinOpacity);
  const playbackDirection = useEditorStore((s) => s.playbackDirection);
  const colorFilters = useEditorStore((s) => s.colorFilters);
  const placingLighting = useEditorStore((s) => s.placingLighting);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const isStrokeActive = useEditorStore((s) => s.isStrokeActive);
  const strokePreviewTick = useEditorStore((s) => s.strokePreviewTick);
  const selection = useSelection();
  const selectionPreview = useSelectionPreview();
  const pastePreview = usePastePreview();
  const movePreview = useMovePreview();
  const setHoverCell = useEditorStore((s) => s.setHoverCell);
  const fitToView = useViewportStore((s) => s.fitToView);
  const addColorFilterLightingPoint = useEditorStore(
    (s) => s.addColorFilterLightingPoint,
  );

  return {
    activeTool,
    readOnly,
    gridWidth,
    gridHeight,
    committedPixels,
    paletteColors,
    frameCount,
    activeFrameIndex,
    framePixelsByIndex,
    onionSkinEnabled,
    onionSkinOpacity,
    playbackDirection,
    colorFilters,
    placingLighting,
    isPlaying,
    isStrokeActive,
    strokePreviewTick,
    selection,
    selectionPreview,
    pastePreview,
    movePreview,
    setHoverCell,
    fitToView,
    addColorFilterLightingPoint,
  };
}

type StrokePreviewRedrawParams = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderState: CanvasRenderState;
  pixelsRef: React.MutableRefObject<Uint8Array>;
};

type PlacementPreview = {
  originX: number;
  originY: number;
  clipboard: { width: number; height: number; pixels: Uint8Array };
};

/** RAF-coalesced redraw during active strokes; partial repaint for placement previews. */
export function useStrokePreviewRedraw({
  containerRef,
  canvasRef,
  renderState,
  pixelsRef,
}: StrokePreviewRedrawParams): {
  redraw: () => void;
  scheduleRedraw: () => void;
  cancelScheduledRedraw: () => void;
} {
  const redrawRef = useRef<() => void>(() => {});
  const rafRedrawRef = useRef<number | null>(null);
  const strokeBaselineReadyRef = useRef(false);
  const placementBaselineReadyRef = useRef(false);
  const prevPreviewCellKeysRef = useRef<Set<string>>(new Set());
  const prevPlacementRef = useRef<PlacementPreview | null>(null);

  const {
    gridWidth,
    gridHeight,
    committedPixels,
    isStrokeActive,
    paletteColors,
    colorFilters,
    readOnly,
    isPlaying,
    frameCount,
    activeFrameIndex,
    framePixelsByIndex,
    onionSkinEnabled,
    onionSkinOpacity,
    playbackDirection,
    strokePreviewTick,
    selection,
    selectionPreview,
    pastePreview,
    movePreview,
  } = renderState;

  const placementPreview: PlacementPreview | null =
    pastePreview ?? movePreview ?? null;

  const redraw = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;
    if (cssWidth <= 0 || cssHeight <= 0) {
      return;
    }

    const ctx = setupHiDpiCanvas(canvas, cssWidth, cssHeight);
    const tokens = readCanvasTokens(canvas);

    const showFilterPreview =
      !readOnly && hasActiveColorFilters(colorFilters);

    let onionSkinPixels: Uint8Array | undefined;
    if (features.onionSkin && onionSkinEnabled && frameCount > 1) {
      const onionIndex = resolveOnionSkinFrameIndex(
        activeFrameIndex,
        frameCount,
        isPlaying,
        playbackDirection,
      );
      if (onionIndex !== null) {
        onionSkinPixels = framePixelsByIndex[onionIndex];
      }
    }

    const basePixels = committedPixels ?? pixelsRef.current;
    const { zoom, panX, panY } = useViewportStore.getState();
    const viewport = { zoom, panX, panY };
    const previewChanges = getStrokePreviewChanges();
    const canRepaintStrokeCells =
      isStrokeActive &&
      !showFilterPreview &&
      strokeBaselineReadyRef.current;

    if (canRepaintStrokeCells) {
      const currentKeys = new Set(
        previewChanges.map((change) => `${change.x},${change.y}`),
      );
      const affectedKeys = new Set([
        ...prevPreviewCellKeysRef.current,
        ...currentKeys,
      ]);
      const previewByKey = new Map(
        previewChanges.map((change) => [
          `${change.x},${change.y}`,
          { next: change.next },
        ]),
      );

      repaintGridCells({
        ctx,
        gridWidth,
        gridHeight,
        basePixels,
        paletteColors,
        viewport,
        tokens,
        cells: Array.from(affectedKeys).map((key) => {
          const [x, y] = key.split(",").map(Number);
          return { x, y };
        }),
        previewByKey,
        onionSkinPixels,
        onionSkinOpacity,
      });

      prevPreviewCellKeysRef.current = currentKeys;
      return;
    }

    const canRepaintPlacementCells =
      placementPreview &&
      !isStrokeActive &&
      !showFilterPreview &&
      placementBaselineReadyRef.current;

    if (canRepaintPlacementCells) {
      const isMove = Boolean(movePreview);
      const currentKeys = isMove
        ? movePreviewAffectedCellKeys(movePreview!)
        : clipboardPreviewCellKeys(
            placementPreview.originX,
            placementPreview.originY,
            placementPreview.clipboard,
          );
      const affectedKeys = new Set([
        ...prevPreviewCellKeysRef.current,
        ...currentKeys,
      ]);
      const previewByKey = isMove
        ? buildMovePreviewByKey(movePreview!)
        : buildClipboardPreviewByKey(
            placementPreview.originX,
            placementPreview.originY,
            placementPreview.clipboard,
          );

      repaintGridCells({
        ctx,
        gridWidth,
        gridHeight,
        basePixels,
        paletteColors,
        viewport,
        tokens,
        cells: Array.from(affectedKeys).map((key) => {
          const [x, y] = key.split(",").map(Number);
          return { x, y };
        }),
        previewByKey,
        onionSkinPixels,
        onionSkinOpacity,
      });

      const activeSelection = selectionPreview ?? selection;
      if (activeSelection) {
        drawSelectionOutline(ctx, activeSelection, viewport, 0);
      }

      prevPreviewCellKeysRef.current = currentKeys;
      prevPlacementRef.current = placementPreview;
      return;
    }

    const pixels = isStrokeActive
      ? mergeStrokePreviewIntoPixels(basePixels, gridWidth)
      : basePixels;

    renderGrid({
      ctx,
      cssWidth,
      cssHeight,
      gridWidth,
      gridHeight,
      pixels,
      paletteColors,
      viewport,
      tokens,
      colorFilters: showFilterPreview ? colorFilters : undefined,
      showLightingMarkers: showFilterPreview && !isPlaying,
      onionSkinPixels,
      onionSkinOpacity,
      selection,
      selectionPreview,
      selectionDashOffset: 0,
      drawSelectionOutline: false,
      pastePreview,
      movePreview,
    });

    if (isStrokeActive && !showFilterPreview) {
      strokeBaselineReadyRef.current = true;
      prevPreviewCellKeysRef.current = new Set(
        previewChanges.map((change) => `${change.x},${change.y}`),
      );
      placementBaselineReadyRef.current = false;
      prevPlacementRef.current = null;
    } else if (placementPreview && !showFilterPreview) {
      placementBaselineReadyRef.current = true;
      prevPreviewCellKeysRef.current = movePreview
        ? movePreviewAffectedCellKeys(movePreview)
        : clipboardPreviewCellKeys(
            placementPreview.originX,
            placementPreview.originY,
            placementPreview.clipboard,
          );
      prevPlacementRef.current = placementPreview;
      strokeBaselineReadyRef.current = false;
    } else {
      strokeBaselineReadyRef.current = false;
      placementBaselineReadyRef.current = false;
      prevPreviewCellKeysRef.current.clear();
      prevPlacementRef.current = null;
    }
  }, [
    containerRef,
    canvasRef,
    gridWidth,
    gridHeight,
    committedPixels,
    isStrokeActive,
    paletteColors,
    colorFilters,
    readOnly,
    isPlaying,
    frameCount,
    activeFrameIndex,
    framePixelsByIndex,
    onionSkinEnabled,
    onionSkinOpacity,
    playbackDirection,
    pixelsRef,
    selection,
    selectionPreview,
    pastePreview,
    movePreview,
    placementPreview,
  ]);

  redrawRef.current = redraw;

  const scheduleRedraw = useCallback(() => {
    if (rafRedrawRef.current !== null) {
      return;
    }

    rafRedrawRef.current = requestAnimationFrame(() => {
      rafRedrawRef.current = null;
      redrawRef.current();
    });
  }, []);

  const cancelScheduledRedraw = useCallback(() => {
    if (rafRedrawRef.current !== null) {
      cancelAnimationFrame(rafRedrawRef.current);
      rafRedrawRef.current = null;
    }
  }, []);

  useEffect(() => {
    redrawRef.current();
  }, [
    selection,
    selectionPreview,
    pastePreview,
    movePreview,
  ]);

  const zoom = useViewportStore((s) => s.zoom);
  const panX = useViewportStore((s) => s.panX);
  const panY = useViewportStore((s) => s.panY);

  useEffect(() => {
    redrawRef.current();
  }, [zoom, panX, panY]);

  useEffect(() => {
    redrawRef.current();
  }, [
    committedPixels,
    gridWidth,
    gridHeight,
    paletteColors,
    colorFilters,
    readOnly,
    isPlaying,
    frameCount,
    activeFrameIndex,
    framePixelsByIndex,
    onionSkinEnabled,
    onionSkinOpacity,
    playbackDirection,
  ]);

  useEffect(() => {
    if (isStrokeActive) {
      scheduleRedraw();
      return () => {
        cancelScheduledRedraw();
      };
    }

    cancelScheduledRedraw();
    redrawRef.current();
  }, [
    isStrokeActive,
    strokePreviewTick,
    cancelScheduledRedraw,
    scheduleRedraw,
  ]);

  useEffect(() => {
    if (!placementPreview || isStrokeActive) {
      return;
    }
    scheduleRedraw();
    return () => {
      cancelScheduledRedraw();
    };
  }, [
    placementPreview,
    placementPreview?.originX,
    placementPreview?.originY,
    isStrokeActive,
    scheduleRedraw,
    cancelScheduledRedraw,
  ]);

  return { redraw, scheduleRedraw, cancelScheduledRedraw };
}
