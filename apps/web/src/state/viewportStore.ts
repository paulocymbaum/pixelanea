import { create } from "zustand";
import type { Size, Viewport } from "@/canvas/coordinates";
import {
  fitToView as computeFitToView,
  zoomIn as computeZoomIn,
  zoomOut as computeZoomOut,
  clampZoom,
} from "@/canvas/coordinates";

type ViewportState = {
  zoom: number;
  panX: number;
  panY: number;
  viewportUserAdjusted: boolean;
  containerSize: Size;
  setContainerSize: (size: Size) => void;
  setViewport: (viewport: Viewport) => void;
  setZoom: (zoom: number) => void;
  zoomIn: (anchor?: { x: number; y: number }) => void;
  zoomOut: (anchor?: { x: number; y: number }) => void;
  fitToView: (
    size: Size | undefined,
    gridWidth: number,
    gridHeight: number,
  ) => void;
  resetViewport: () => void;
};

export const useViewportStore = create<ViewportState>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  viewportUserAdjusted: false,
  containerSize: { width: 0, height: 0 },

  setContainerSize: (size) => set({ containerSize: size }),

  setViewport: (viewport) =>
    set({
      zoom: clampZoom(viewport.zoom),
      panX: viewport.panX,
      panY: viewport.panY,
      viewportUserAdjusted: true,
    }),

  setZoom: (zoom) =>
    set({ zoom: clampZoom(zoom), viewportUserAdjusted: true }),

  zoomIn: (anchor) => {
    const { zoom, panX, panY } = get();
    const next = computeZoomIn({ zoom, panX, panY }, anchor);
    set({ ...next, viewportUserAdjusted: true });
  },

  zoomOut: (anchor) => {
    const { zoom, panX, panY } = get();
    const next = computeZoomOut({ zoom, panX, panY }, anchor);
    set({ ...next, viewportUserAdjusted: true });
  },

  fitToView: (size, gridWidth, gridHeight) => {
    const container = size ?? get().containerSize;
    if (container.width <= 0 || container.height <= 0) {
      return;
    }
    const viewport = computeFitToView(container, gridWidth, gridHeight);
    set({ ...viewport, viewportUserAdjusted: false });
  },

  resetViewport: () =>
    set({
      zoom: 1,
      panX: 0,
      panY: 0,
      viewportUserAdjusted: false,
    }),
}));

export const useViewport = () =>
  useViewportStore((s) => ({
    zoom: s.zoom,
    panX: s.panX,
    panY: s.panY,
  }));
