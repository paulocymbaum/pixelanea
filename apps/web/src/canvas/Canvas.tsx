import { copy } from "@/content/copy";
import { useCanvasRenderState, useStrokePreviewRedraw } from "@/canvas/useCanvasRenderState";
import { useSelectionOutlineOverlay } from "@/canvas/useSelectionOutlineOverlay";
import { useViewportInteraction } from "@/canvas/useViewportInteraction";
import { useViewportStore } from "@/state/viewportStore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isCellInBounds,
  screenToCell,
} from "./coordinates";
import { getToolCursor } from "@/tools/registry";
import { useToolInput } from "@/tools/useToolInput";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { ZoomControls } from "./ZoomControls";
import { SelectionActionBar, selectionActionBarAnchor } from "./SelectionActionBar";

function isPlacementActive(): boolean {
  const state = useEditorStore.getState();
  return Boolean(state.pastePreview ?? state.movePreview);
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const toolInput = useToolInput();
  const pixelsRef = useRef<Uint8Array>(new Uint8Array());
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    zoom: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const {
    onPanMove,
    onPanCommit,
    onPanPreviewEnd,
    isWheelZooming,
  } = useViewportInteraction(canvasRef, overlayCanvasRef);

  const renderState = useCanvasRenderState();
  const zoom = useViewportStore((s) => s.zoom);
  const panX = useViewportStore((s) => s.panX);
  const panY = useViewportStore((s) => s.panY);
  const {
    activeTool,
    readOnly,
    gridWidth,
    gridHeight,
    committedPixels,
    frameCount,
    framePixelsByIndex,
    placingLighting,
    isPlaying,
    selection,
    selectionPreview,
    pastePreview,
    movePreview,
    setHoverCell,
    fitToView,
    addColorFilterLightingPoint,
  } = renderState;

  const { redraw } = useStrokePreviewRedraw({
    containerRef,
    canvasRef,
    renderState,
    pixelsRef,
  });

  useSelectionOutlineOverlay({
    overlayCanvasRef,
    containerRef,
    selection,
    selectionPreview,
    movePreview,
    pastePreview,
    zoom,
    panX,
    panY,
    isViewportInteracting: isPanning || isWheelZooming,
  });

  useEffect(() => {
    if (committedPixels) {
      pixelsRef.current = committedPixels;
    }
  }, [committedPixels]);

  const setContainerSize = useViewportStore((s) => s.setContainerSize);
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateContainerSize = () => {
      const size = {
        width: container.clientWidth,
        height: container.clientHeight,
      };
      setContainerSize(size);
      return size;
    };

    const observer = new ResizeObserver(() => {
      updateContainerSize();
      redraw();
    });

    observer.observe(container);
    updateContainerSize();

    if (!initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      fitToView(
        {
          width: container.clientWidth,
          height: container.clientHeight,
        },
        gridWidth,
        gridHeight,
      );
    }

    return () => observer.disconnect();
  }, [fitToView, gridWidth, gridHeight, redraw, setContainerSize]);

  const prevGridSizeRef = useRef({ width: gridWidth, height: gridHeight });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const gridChanged =
      prevGridSizeRef.current.width !== gridWidth ||
      prevGridSizeRef.current.height !== gridHeight;
    prevGridSizeRef.current = { width: gridWidth, height: gridHeight };

    if (!gridChanged) {
      return;
    }

    fitToView(
      {
        width: container.clientWidth,
        height: container.clientHeight,
      },
      gridWidth,
      gridHeight,
    );
  }, [fitToView, gridWidth, gridHeight]);

  const updateHoverFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      const cell = screenToCell(screenX, screenY, { zoom, panX, panY });

      if (cell && isCellInBounds(cell, gridWidth, gridHeight)) {
        setHoverCell(cell);
        return cell;
      }

      setHoverCell(null);
      return null;
    },
    [gridWidth, gridHeight, panX, panY, setHoverCell, zoom],
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const placementActive = isPlacementActive();

    if (panDragRef.current && activeTool === "hand" && !placementActive) {
      onPanMove(event.clientX, event.clientY, panDragRef.current);
      return;
    }

    const cell = updateHoverFromPointer(event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    if (placementActive) {
      toolInput.onPointerMove(event.nativeEvent, cell);
      return;
    }

    if (readOnly || placingLighting || activeTool === "hand") {
      return;
    }
    toolInput.onPointerMove(event.nativeEvent, cell);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const placementActive = isPlacementActive();

    if (activeTool === "hand" && !readOnly && !placementActive) {
      panDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        panX,
        panY,
        zoom,
      };
      setIsPanning(true);
      return;
    }

    const cell = updateHoverFromPointer(event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    if (placementActive) {
      toolInput.onPointerDown(event.nativeEvent, cell);
      return;
    }

    if (readOnly) {
      return;
    }

    if (placingLighting) {
      addColorFilterLightingPoint({
        x: cell.x,
        y: cell.y,
        radius: 5,
        intensity: 0.5,
      });
      return;
    }

    toolInput.onPointerDown(event.nativeEvent, cell);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const placementActive = isPlacementActive();

    if (panDragRef.current) {
      const drag = panDragRef.current;
      panDragRef.current = null;
      setIsPanning(false);
      onPanCommit(event.clientX, event.clientY, drag);
      return;
    }

    const cell = updateHoverFromPointer(event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    if (placementActive) {
      toolInput.onPointerUp(event.nativeEvent, cell);
      return;
    }

    if (readOnly || placingLighting || activeTool === "hand") {
      return;
    }
    toolInput.onPointerUp(event.nativeEvent, cell);
  };

  const endPan = () => {
    if (panDragRef.current) {
      panDragRef.current = null;
      setIsPanning(false);
      onPanPreviewEnd();
    }
  };

  const pastePreviewStore = useEditorStore((s) => s.pastePreview);
  const movePreviewStore = useEditorStore((s) => s.movePreview);
  const selectionStore = useEditorStore((s) => s.selection);
  const selectionPreviewStore = useEditorStore((s) => s.selectionPreview);
  const projectId = useEditorStore((s) => s.projectId);
  const shortcutsOverlayOpen = useUiStore((s) => s.shortcutsOverlayOpen);
  const onboardingOverlayVisible = useUiStore((s) => s.onboardingOverlayVisible);
  const canvasFocusProjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || !committedPixels || gridWidth <= 0 || gridHeight <= 0) {
      return;
    }

    if (shortcutsOverlayOpen || onboardingOverlayVisible) {
      return;
    }

    if (document.querySelector('[role="dialog"][data-state="open"]')) {
      return;
    }

    if (canvasFocusProjectRef.current === projectId) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.focus({ preventScroll: true });
    canvasFocusProjectRef.current = projectId;
  }, [
    committedPixels,
    gridWidth,
    gridHeight,
    projectId,
    shortcutsOverlayOpen,
    onboardingOverlayVisible,
  ]);

  useEffect(() => {
    if (!projectId) {
      canvasFocusProjectRef.current = null;
    }
  }, [projectId]);

  const canvasCursor = readOnly
    ? "not-allowed"
    : pastePreviewStore || movePreviewStore
      ? "crosshair"
      : placingLighting
      ? "crosshair"
      : activeTool === "hand"
        ? isPanning
          ? "grabbing"
          : "grab"
        : getToolCursor(activeTool);

  const blankCheckPixels = committedPixels ?? pixelsRef.current;
  const canvasIsBlank =
    !blankCheckPixels.some((value) => value !== 0) &&
    Array.from({ length: frameCount }, (_, index) => index).every((index) => {
      const frame = framePixelsByIndex[index] ?? blankCheckPixels;
      return !frame.some((value) => value !== 0);
    });

  const showEmptyCanvasHint =
    !readOnly && !isPlaying && !placingLighting && canvasIsBlank;

  const clearSelection = useEditorStore((s) => s.clearSelection);

  const handleContainerPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.target !== containerRef.current) {
      return;
    }
    if (readOnly || isPlaying) {
      return;
    }
    const state = useEditorStore.getState();
    if (
      state.selection &&
      !state.pastePreview &&
      !state.movePreview &&
      !state.selectionPreview
    ) {
      clearSelection();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[280px] flex-1 overflow-hidden rounded-panel border border-border bg-bg-canvas"
      onPointerDown={handleContainerPointerDown}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        aria-label="Pixel canvas"
        tabIndex={-1}
        style={{ cursor: canvasCursor }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={endPan}
        onPointerLeave={() => {
          endPan();
          setHoverCell(null);
        }}
      />
      <canvas
        ref={overlayCanvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
        aria-hidden
      />
      {showEmptyCanvasHint ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-base text-secondary">
          {copy.emptyCanvasHint}
        </p>
      ) : null}
      {(() => {
        const barAnchor = selectionActionBarAnchor(
          selectionStore,
          pastePreviewStore,
          movePreviewStore,
        );
        return barAnchor && !selectionPreviewStore ? (
          <SelectionActionBar selection={barAnchor} />
        ) : null;
      })()}
      <div className="pointer-events-none absolute bottom-3 right-3">
        <ZoomControls />
      </div>
    </div>
  );
}
