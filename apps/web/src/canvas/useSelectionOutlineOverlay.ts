import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import { useCallback, useEffect, useRef } from "react";
import {
  drawSelectionOutline,
  setupHiDpiCanvas,
} from "./renderer";

const MARCH_STEP_PX = 1;
const MARCH_CYCLE_PX = 8;

type SelectionOutlineOverlayParams = {
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  selection: SelectionRect | null;
  selectionPreview: SelectionRect | null;
  movePreview: unknown;
  pastePreview: unknown;
  zoom: number;
  panX: number;
  panY: number;
  isViewportInteracting?: boolean;
};

/** Animated marching ants on a lightweight overlay — never repaints the pixel grid. */
export function useSelectionOutlineOverlay({
  overlayCanvasRef,
  containerRef,
  selection,
  selectionPreview,
  movePreview,
  pastePreview,
  zoom,
  panX,
  panY,
  isViewportInteracting = false,
}: SelectionOutlineOverlayParams): void {
  const reducedMotion = usePrefersReducedMotion();
  const dashOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const activeSelection = selectionPreview ?? selection;
  const placementActive = Boolean(movePreview || pastePreview);
  const animateAnts =
    Boolean(activeSelection) &&
    !placementActive &&
    !reducedMotion &&
    !isViewportInteracting;

  const clearOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const container = containerRef.current;
    if (!overlay || !container) {
      return;
    }

    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;
    if (cssWidth <= 0 || cssHeight <= 0) {
      return;
    }

    const ctx = setupHiDpiCanvas(overlay, cssWidth, cssHeight);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
  }, [containerRef, overlayCanvasRef]);

  const drawOutline = useCallback(
    (dashOffset: number) => {
      const overlay = overlayCanvasRef.current;
      const container = containerRef.current;
      if (!overlay || !container || !activeSelection) {
        return;
      }

      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight;
      if (cssWidth <= 0 || cssHeight <= 0) {
        return;
      }

      const ctx = setupHiDpiCanvas(overlay, cssWidth, cssHeight);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      drawSelectionOutline(
        ctx,
        activeSelection,
        { zoom, panX, panY },
        dashOffset,
      );
    },
    [activeSelection, containerRef, overlayCanvasRef, panX, panY, zoom],
  );

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!activeSelection || placementActive) {
      clearOverlay();
      return;
    }

    if (!animateAnts) {
      drawOutline(0);
      return;
    }

    const tick = () => {
      dashOffsetRef.current =
        (dashOffsetRef.current + MARCH_STEP_PX) % MARCH_CYCLE_PX;
      drawOutline(dashOffsetRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    activeSelection,
    animateAnts,
    clearOverlay,
    drawOutline,
    placementActive,
    isViewportInteracting,
  ]);

  useEffect(() => {
    if (!activeSelection || placementActive || animateAnts) {
      return;
    }
    drawOutline(0);
  }, [activeSelection, animateAnts, drawOutline, placementActive, zoom, panX, panY, isViewportInteracting]);
}
