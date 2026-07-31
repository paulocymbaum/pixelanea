import { useEditorStore } from "@/state/editorStore";
import { hasActiveColorFilters } from "@/lib/colorFilters";
import { useCallback, useEffect, useRef } from "react";
import {
  isCellInBounds,
  screenToCell,
  zoomAtPoint,
  ZOOM_STEP,
} from "./coordinates";
import { readCanvasTokens, renderGrid, setupHiDpiCanvas } from "./renderer";
import { getToolCursor } from "@/tools/registry";
import { useToolInput } from "@/tools/useToolInput";
import { ZoomControls } from "./ZoomControls";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolInput = useToolInput();

  const activeTool = useEditorStore((s) => s.activeTool);
  const readOnly = useEditorStore((s) => s.readOnly);
  const gridWidth = useEditorStore((s) => s.gridWidth);
  const gridHeight = useEditorStore((s) => s.gridHeight);
  const pixels = useEditorStore((s) => s.pixels);
  const paletteColors = useEditorStore((s) => s.paletteColors);
  const activeFrameIndex = useEditorStore((s) => s.activeFrameIndex);
  const frameCount = useEditorStore((s) => s.frameCount);
  const framePixelsByIndex = useEditorStore((s) => s.framePixelsByIndex);
  const onionSkinEnabled = useEditorStore((s) => s.onionSkinEnabled);
  const colorFilters = useEditorStore((s) => s.colorFilters);
  const placingLighting = useEditorStore((s) => s.placingLighting);
  const addColorFilterLightingPoint = useEditorStore(
    (s) => s.addColorFilterLightingPoint,
  );
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const setHoverCell = useEditorStore((s) => s.setHoverCell);
  const setViewport = useEditorStore((s) => s.setViewport);
  const fitToView = useEditorStore((s) => s.fitToView);

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

    const showOnionSkin =
      onionSkinEnabled &&
      !readOnly &&
      !isPlaying &&
      frameCount > 1 &&
      activeFrameIndex > 0;
    const onionSkinPixels = showOnionSkin
      ? framePixelsByIndex[activeFrameIndex - 1]
      : undefined;

    const showFilterPreview =
      !readOnly && hasActiveColorFilters(colorFilters);

    renderGrid({
      ctx,
      cssWidth,
      cssHeight,
      gridWidth,
      gridHeight,
      pixels,
      paletteColors,
      viewport: { zoom, panX, panY },
      tokens,
      onionSkinPixels,
      colorFilters: showFilterPreview ? colorFilters : undefined,
      showLightingMarkers: showFilterPreview && !isPlaying,
    });
  }, [
    gridWidth,
    gridHeight,
    pixels,
    paletteColors,
    zoom,
    panX,
    panY,
    activeFrameIndex,
    frameCount,
    framePixelsByIndex,
    onionSkinEnabled,
    colorFilters,
    readOnly,
    isPlaying,
  ]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const setContainerSize = useEditorStore((s) => s.setContainerSize);

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
    const size = updateContainerSize();
    fitToView(size);

    return () => observer.disconnect();
  }, [fitToView, redraw, setContainerSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    fitToView({
      width: container.clientWidth,
      height: container.clientHeight,
    });
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

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const anchorX = event.clientX - rect.left;
    const anchorY = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const nextZoom = zoom * factor;

    const next = zoomAtPoint({ zoom, panX, panY }, anchorX, anchorY, nextZoom);
    setViewport(next);
  };

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
        onWheel={handleWheel}
      />
      <div className="pointer-events-none absolute bottom-3 right-3">
        <ZoomControls />
      </div>
    </div>
  );
}
