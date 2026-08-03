import { copy } from "@/content/copy";
import { useCanvasRenderState, useStrokePreviewRedraw } from "@/canvas/useCanvasRenderState";
import { useViewportStore } from "@/state/viewportStore";
import { useCallback, useEffect, useRef } from "react";
import {
  isCellInBounds,
  screenToCell,
  zoomAtPoint,
  ZOOM_STEP,
} from "./coordinates";
import { getToolCursor } from "@/tools/registry";
import { useToolInput } from "@/tools/useToolInput";
import { ZoomControls } from "./ZoomControls";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolInput = useToolInput();
  const pixelsRef = useRef<Uint8Array>(new Uint8Array());

  const renderState = useCanvasRenderState();
  const {
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
    colorFilters,
    placingLighting,
    isPlaying,
    zoom,
    panX,
    panY,
    isStrokeActive,
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const viewport = useViewportStore.getState();
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const nextZoom = viewport.zoom * factor;
      const next = zoomAtPoint(
        { zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY },
        anchorX,
        anchorY,
        nextZoom,
      );
      useViewportStore.getState().setViewport(next);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

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
    const cell = updateHoverFromPointer(event.clientX, event.clientY);
    if (!cell || readOnly || placingLighting) {
      return;
    }
    toolInput.onPointerMove(event.nativeEvent, cell);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const cell = updateHoverFromPointer(event.clientX, event.clientY);
    if (!cell || readOnly) {
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
    const cell = updateHoverFromPointer(event.clientX, event.clientY);
    if (!cell || readOnly || placingLighting) {
      return;
    }
    toolInput.onPointerUp(event.nativeEvent, cell);
  };

  const canvasCursor = readOnly
    ? "not-allowed"
    : placingLighting
      ? "crosshair"
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

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[280px] flex-1 overflow-hidden rounded-panel border border-border bg-bg-canvas"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Pixel canvas"
        style={{ cursor: canvasCursor }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setHoverCell(null)}
      />
      {showEmptyCanvasHint ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-base text-secondary">
          {copy.emptyCanvasHint}
        </p>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 right-3">
        <ZoomControls />
      </div>
    </div>
  );
}
