import { useCallback, useEffect, useRef, useState } from "react";
import { useViewportStore } from "@/state/viewportStore";
import { zoomAtPoint, ZOOM_STEP, type Viewport } from "./coordinates";

type PanDragState = {
  startX: number;
  startY: number;
  panX: number;
  panY: number;
  zoom: number;
};

type PendingWheel = {
  anchorX: number;
  anchorY: number;
  compoundFactor: number;
};

export type ViewportInteractionState = {
  isWheelZooming: boolean;
  panPreviewOffset: { x: number; y: number } | null;
};

/** RAF-coalesced wheel zoom and pan viewport updates. */
export function useViewportInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>,
): {
  onPanMove: (clientX: number, clientY: number, drag: PanDragState) => void;
  onPanCommit: (clientX: number, clientY: number, drag: PanDragState) => void;
  onPanPreviewEnd: () => void;
  isWheelZooming: boolean;
  panPreviewOffset: { x: number; y: number } | null;
} {
  const wheelRafRef = useRef<number | null>(null);
  const pendingWheelRef = useRef<PendingWheel | null>(null);
  const [isWheelZooming, setIsWheelZooming] = useState(false);
  const panPreviewOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const applyPanPreview = useCallback(
    (offset: { x: number; y: number } | null) => {
      panPreviewOffsetRef.current = offset;
      const transform = offset
        ? `translate(${offset.x}px, ${offset.y}px)`
        : "";
      const canvas = canvasRef.current;
      const overlay = overlayCanvasRef.current;
      if (canvas) {
        canvas.style.transform = transform;
      }
      if (overlay) {
        overlay.style.transform = transform;
      }
    },
    [canvasRef, overlayCanvasRef],
  );

  const cancelWheelRaf = useCallback(() => {
    if (wheelRafRef.current !== null) {
      cancelAnimationFrame(wheelRafRef.current);
      wheelRafRef.current = null;
    }
  }, []);

  const flushWheel = useCallback(() => {
    wheelRafRef.current = null;
    setIsWheelZooming(false);
    const pending = pendingWheelRef.current;
    if (!pending) {
      return;
    }
    pendingWheelRef.current = null;

    const viewport = useViewportStore.getState();
    const nextZoom = viewport.zoom * pending.compoundFactor;
    const next = zoomAtPoint(
      { zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY },
      pending.anchorX,
      pending.anchorY,
      nextZoom,
    );
    useViewportStore.getState().setViewport(next);
  }, []);

  const scheduleWheelFlush = useCallback(() => {
    if (wheelRafRef.current !== null) {
      return;
    }
    setIsWheelZooming(true);
    wheelRafRef.current = requestAnimationFrame(flushWheel);
  }, [flushWheel]);

  const onPanMove = useCallback(
    (clientX: number, clientY: number, drag: PanDragState) => {
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      applyPanPreview({ x: dx, y: dy });
    },
    [applyPanPreview],
  );

  const onPanCommit = useCallback(
    (clientX: number, clientY: number, drag: PanDragState) => {
      applyPanPreview(null);

      const next: Viewport = {
        zoom: drag.zoom,
        panX: drag.panX + (clientX - drag.startX),
        panY: drag.panY + (clientY - drag.startY),
      };
      useViewportStore.getState().setViewport(next);
    },
    [applyPanPreview],
  );

  const onPanPreviewEnd = useCallback(() => {
    applyPanPreview(null);
  }, [applyPanPreview]);

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
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

      if (pendingWheelRef.current) {
        pendingWheelRef.current.compoundFactor *= factor;
        pendingWheelRef.current.anchorX = anchorX;
        pendingWheelRef.current.anchorY = anchorY;
      } else {
        pendingWheelRef.current = { anchorX, anchorY, compoundFactor: factor };
      }

      scheduleWheelFlush();
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      cancelWheelRaf();
      pendingWheelRef.current = null;
      setIsWheelZooming(false);
    };
  }, [canvasRef, cancelWheelRaf, scheduleWheelFlush]);

  useEffect(() => {
    return () => {
      cancelWheelRaf();
      applyPanPreview(null);
    };
  }, [applyPanPreview, cancelWheelRaf]);

  return {
    onPanMove,
    onPanCommit,
    onPanPreviewEnd,
    isWheelZooming,
    panPreviewOffset: panPreviewOffsetRef.current,
  };
}
