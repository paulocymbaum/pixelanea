export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 32;
export const GRID_LINE_MIN_ZOOM = 8;
export const ZOOM_STEP = 1.25;
export const FIT_PADDING_PX = 16;

export type CellCoord = {
  x: number;
  y: number;
};

export type Viewport = {
  zoom: number;
  panX: number;
  panY: number;
};

export type Size = {
  width: number;
  height: number;
};

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function screenToCell(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): CellCoord | null {
  const cellX = Math.floor((screenX - viewport.panX) / viewport.zoom);
  const cellY = Math.floor((screenY - viewport.panY) / viewport.zoom);

  return { x: cellX, y: cellY };
}

export function isCellInBounds(
  cell: CellCoord,
  gridWidth: number,
  gridHeight: number,
): boolean {
  return (
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < gridWidth &&
    cell.y < gridHeight
  );
}

export function cellToScreen(
  cell: CellCoord,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: viewport.panX + cell.x * viewport.zoom,
    y: viewport.panY + cell.y * viewport.zoom,
  };
}

export function fitToView(
  container: Size,
  gridWidth: number,
  gridHeight: number,
  padding = FIT_PADDING_PX,
): Viewport {
  const availableWidth = Math.max(1, container.width - padding * 2);
  const availableHeight = Math.max(1, container.height - padding * 2);
  const zoom = clampZoom(
    Math.min(availableWidth / gridWidth, availableHeight / gridHeight),
  );

  const gridPixelWidth = gridWidth * zoom;
  const gridPixelHeight = gridHeight * zoom;

  return {
    zoom,
    panX: (container.width - gridPixelWidth) / 2,
    panY: (container.height - gridPixelHeight) / 2,
  };
}

/** Zoom toward a screen-space anchor while keeping that point fixed. */
export function zoomAtPoint(
  viewport: Viewport,
  anchorX: number,
  anchorY: number,
  nextZoom: number,
): Viewport {
  const zoom = clampZoom(nextZoom);
  const scale = zoom / viewport.zoom;

  return {
    zoom,
    panX: anchorX - (anchorX - viewport.panX) * scale,
    panY: anchorY - (anchorY - viewport.panY) * scale,
  };
}

export function zoomIn(viewport: Viewport, anchor?: { x: number; y: number }): Viewport {
  const nextZoom = clampZoom(viewport.zoom * ZOOM_STEP);
  if (anchor) {
    return zoomAtPoint(viewport, anchor.x, anchor.y, nextZoom);
  }
  return { ...viewport, zoom: nextZoom };
}

export function zoomOut(viewport: Viewport, anchor?: { x: number; y: number }): Viewport {
  const nextZoom = clampZoom(viewport.zoom / ZOOM_STEP);
  if (anchor) {
    return zoomAtPoint(viewport, anchor.x, anchor.y, nextZoom);
  }
  return { ...viewport, zoom: nextZoom };
}

export function formatZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
