import { TRANSPARENT_INDEX } from "@/state/commands/types";
import {
  computeFilteredRgb,
  hasActiveColorFilters,
  parseHex,
  rgbToCss,
  type ColorFilterSettings,
  type LightingPoint,
} from "@/lib/colorFilters";
import {
  GRID_LINE_MIN_ZOOM,
  type Viewport,
} from "./coordinates";
import type { SelectionRect } from "./selectionGeometry";
import type { PastePreview } from "@/state/editorStorePaste";
import { DEFAULT_PALETTE_COLORS } from "./palette";

export type CanvasTokens = {
  checkerA: string;
  checkerB: string;
  gridLine: string;
};

export const ONION_SKIN_OPACITY = 0.3;
export const PASTE_PREVIEW_OPACITY = 0.5;
export const MIN_ONION_SKIN_OPACITY = 0.05;
export const MAX_ONION_SKIN_OPACITY = 1;

export function clampOnionSkinOpacity(opacity: number): number {
  return Math.max(
    MIN_ONION_SKIN_OPACITY,
    Math.min(MAX_ONION_SKIN_OPACITY, opacity),
  );
}

export type RenderGridOptions = {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  gridWidth: number;
  gridHeight: number;
  pixels: Uint8Array;
  paletteColors: readonly string[];
  viewport: Viewport;
  tokens: CanvasTokens;
  onionSkinPixels?: Uint8Array;
  onionSkinOpacity?: number;
  colorFilters?: ColorFilterSettings;
  showLightingMarkers?: boolean;
  selection?: SelectionRect | null;
  selectionPreview?: SelectionRect | null;
  selectionDashOffset?: number;
  pastePreview?: PastePreview | null;
};

export type RepaintGridCellsOptions = {
  ctx: CanvasRenderingContext2D;
  gridWidth: number;
  gridHeight: number;
  basePixels: Uint8Array;
  paletteColors: readonly string[];
  viewport: Viewport;
  tokens: CanvasTokens;
  cells: Iterable<{ x: number; y: number }>;
  previewByKey?: ReadonlyMap<string, { next: number }>;
  onionSkinPixels?: Uint8Array;
  onionSkinOpacity?: number;
};

const CHECKER_CELL_PX = 8;

const lastHiDpiSize = new WeakMap<
  HTMLCanvasElement,
  { width: number; height: number; dpr: number }
>();

export function readCanvasTokens(element: HTMLElement): CanvasTokens {
  const style = getComputedStyle(element);
  return {
    checkerA: style.getPropertyValue("--color-checker-a").trim() || "#cccccc",
    checkerB: style.getPropertyValue("--color-checker-b").trim() || "#ffffff",
    gridLine: style.getPropertyValue("--color-grid-line").trim() || "rgba(0,0,0,0.08)",
  };
}

export function setupHiDpiCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
  const last = lastHiDpiSize.get(canvas);

  if (
    !last ||
    last.width !== pixelWidth ||
    last.height !== pixelHeight ||
    last.dpr !== dpr
  ) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    lastHiDpiSize.set(canvas, {
      width: pixelWidth,
      height: pixelHeight,
      dpr,
    });
  }

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tokens: CanvasTokens,
): void {
  ctx.fillStyle = tokens.checkerA;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = tokens.checkerB;
  for (let py = 0; py < height; py += CHECKER_CELL_PX) {
    for (let px = 0; px < width; px += CHECKER_CELL_PX) {
      const col = Math.floor((x + px) / CHECKER_CELL_PX);
      const row = Math.floor((y + py) / CHECKER_CELL_PX);
      if ((col + row) % 2 === 1) {
        ctx.fillRect(x + px, y + py, CHECKER_CELL_PX, CHECKER_CELL_PX);
      }
    }
  }
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function drawCheckerCell(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  viewport: Viewport,
  tokens: CanvasTokens,
): void {
  const cellSize = viewport.zoom;
  const originX = viewport.panX;
  const originY = viewport.panY;
  const px = originX + cellX * cellSize;
  const py = originY + cellY * cellSize;

  for (let dy = 0; dy < cellSize; dy += CHECKER_CELL_PX) {
    for (let dx = 0; dx < cellSize; dx += CHECKER_CELL_PX) {
      const checkerCol = Math.floor((px + dx) / CHECKER_CELL_PX);
      const checkerRow = Math.floor((py + dy) / CHECKER_CELL_PX);
      ctx.fillStyle =
        (checkerCol + checkerRow) % 2 === 0 ? tokens.checkerA : tokens.checkerB;
      ctx.fillRect(
        px + dx,
        py + dy,
        Math.min(CHECKER_CELL_PX, cellSize - dx),
        Math.min(CHECKER_CELL_PX, cellSize - dy),
      );
    }
  }
}

function drawPixelCell(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  index: number,
  paletteColors: readonly string[],
  viewport: Viewport,
  opacity = 1,
): void {
  if (index === TRANSPARENT_INDEX) {
    return;
  }

  const cellSize = viewport.zoom;
  const originX = viewport.panX;
  const originY = viewport.panY;
  const previousAlpha = ctx.globalAlpha;

  if (opacity !== 1) {
    ctx.globalAlpha = opacity;
  }

  const color = paletteColors[index] ?? DEFAULT_PALETTE_COLORS[0];
  ctx.fillStyle = color;
  ctx.fillRect(
    originX + cellX * cellSize,
    originY + cellY * cellSize,
    cellSize,
    cellSize,
  );

  ctx.globalAlpha = previousAlpha;
}

function drawCellGridLines(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  gridWidth: number,
  gridHeight: number,
  viewport: Viewport,
  tokens: CanvasTokens,
): void {
  if (viewport.zoom < GRID_LINE_MIN_ZOOM) {
    return;
  }

  const cellSize = viewport.zoom;
  const originX = viewport.panX;
  const originY = viewport.panY;
  const left = originX + cellX * cellSize;
  const top = originY + cellY * cellSize;
  const right = left + cellSize;
  const bottom = top + cellSize;

  ctx.strokeStyle = tokens.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const lineX = left + 0.5;
  ctx.moveTo(lineX, top);
  ctx.lineTo(lineX, bottom);

  const lineRight = right + 0.5;
  ctx.moveTo(lineRight, top);
  ctx.lineTo(lineRight, bottom);

  const lineY = top + 0.5;
  ctx.moveTo(left, lineY);
  ctx.lineTo(right, lineY);

  const lineBottom = bottom + 0.5;
  ctx.moveTo(left, lineBottom);
  ctx.lineTo(right, lineBottom);

  ctx.stroke();
}

function drawPixels(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  pixels: Uint8Array,
  paletteColors: readonly string[],
  viewport: Viewport,
  opacity = 1,
): void {
  const cellSize = viewport.zoom;
  const originX = viewport.panX;
  const originY = viewport.panY;
  const previousAlpha = ctx.globalAlpha;

  if (opacity !== 1) {
    ctx.globalAlpha = opacity;
  }

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const index = pixels[y * gridWidth + x] ?? 0;
      if (index === TRANSPARENT_INDEX) {
        continue;
      }
      const color = paletteColors[index] ?? DEFAULT_PALETTE_COLORS[0];
      ctx.fillStyle = color;
      ctx.fillRect(
        originX + x * cellSize,
        originY + y * cellSize,
        cellSize,
        cellSize,
      );
    }
  }

  ctx.globalAlpha = previousAlpha;
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  viewport: Viewport,
  tokens: CanvasTokens,
): void {
  if (viewport.zoom < GRID_LINE_MIN_ZOOM) {
    return;
  }

  const originX = viewport.panX;
  const originY = viewport.panY;
  const gridPixelWidth = gridWidth * viewport.zoom;
  const gridPixelHeight = gridHeight * viewport.zoom;

  ctx.strokeStyle = tokens.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x <= gridWidth; x++) {
    const lineX = originX + x * viewport.zoom + 0.5;
    ctx.moveTo(lineX, originY);
    ctx.lineTo(lineX, originY + gridPixelHeight);
  }

  for (let y = 0; y <= gridHeight; y++) {
    const lineY = originY + y * viewport.zoom + 0.5;
    ctx.moveTo(originX, lineY);
    ctx.lineTo(originX + gridPixelWidth, lineY);
  }

  ctx.stroke();
}

function drawFilterPreview(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  pixels: Uint8Array,
  paletteColors: readonly string[],
  viewport: Viewport,
  colorFilters: ColorFilterSettings,
): void {
  const cellSize = viewport.zoom;
  const originX = viewport.panX;
  const originY = viewport.panY;

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const index = pixels[y * gridWidth + x] ?? TRANSPARENT_INDEX;
      if (index === TRANSPARENT_INDEX) {
        continue;
      }

      const sourceRgb = parseHex(paletteColors[index] ?? "");
      if (!sourceRgb) {
        continue;
      }

      const filtered = computeFilteredRgb(x, y, sourceRgb, colorFilters);
      ctx.fillStyle = rgbToCss(filtered);
      ctx.fillRect(
        originX + x * cellSize,
        originY + y * cellSize,
        cellSize,
        cellSize,
      );
    }
  }
}

function drawLightingMarkers(
  ctx: CanvasRenderingContext2D,
  lightingPoints: readonly LightingPoint[],
  viewport: Viewport,
): void {
  const cellSize = viewport.zoom;
  const originX = viewport.panX;
  const originY = viewport.panY;
  const previousAlpha = ctx.globalAlpha;
  const previousStroke = ctx.strokeStyle;
  const previousLineWidth = ctx.lineWidth;

  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "rgba(255, 220, 120, 0.9)";
  ctx.lineWidth = 1.5;

  for (const point of lightingPoints) {
    const centerX = originX + (point.x + 0.5) * cellSize;
    const centerY = originY + (point.y + 0.5) * cellSize;
    const radiusPx = point.radius * cellSize;

    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(3, radiusPx), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = previousAlpha;
  ctx.strokeStyle = previousStroke;
  ctx.lineWidth = previousLineWidth;
}

function strokeSelectionPath(
  ctx: CanvasRenderingContext2D,
  dashOffset: number,
  stroke: () => void,
): void {
  ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
  ctx.lineDashOffset = -dashOffset;
  stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineDashOffset = 4 - dashOffset;
  stroke();
}

export function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  selection: SelectionRect,
  viewport: Viewport,
  dashOffset: number,
): void {
  const cellSize = viewport.zoom;
  const left = viewport.panX + selection.x * cellSize;
  const top = viewport.panY + selection.y * cellSize;
  const width = selection.width * cellSize;
  const height = selection.height * cellSize;

  const previousDash = ctx.getLineDash();
  const previousOffset = ctx.lineDashOffset;
  const previousLineWidth = ctx.lineWidth;

  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  if (selection.shape === "ellipse") {
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    strokeSelectionPath(ctx, dashOffset, () => {
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  } else {
    strokeSelectionPath(ctx, dashOffset, () => {
      ctx.strokeRect(left, top, width, height);
    });
  }

  ctx.setLineDash(previousDash);
  ctx.lineDashOffset = previousOffset;
  ctx.lineWidth = previousLineWidth;
}

export function drawPastePreview(
  ctx: CanvasRenderingContext2D,
  pastePreview: PastePreview,
  paletteColors: readonly string[],
  viewport: Viewport,
  opacity = PASTE_PREVIEW_OPACITY,
): void {
  const { originX, originY, clipboard } = pastePreview;
  const { width, height, pixels } = clipboard;

  for (let ly = 0; ly < height; ly++) {
    for (let lx = 0; lx < width; lx++) {
      const index = pixels[ly * width + lx] ?? TRANSPARENT_INDEX;
      if (index === TRANSPARENT_INDEX) {
        continue;
      }

      drawPixelCell(
        ctx,
        originX + lx,
        originY + ly,
        index,
        paletteColors,
        viewport,
        opacity,
      );
    }
  }
}

export function renderGrid({
  ctx,
  cssWidth,
  cssHeight,
  gridWidth,
  gridHeight,
  pixels,
  paletteColors,
  viewport,
  tokens,
  onionSkinPixels,
  onionSkinOpacity = ONION_SKIN_OPACITY,
  colorFilters,
  showLightingMarkers = false,
  selection = null,
  selectionPreview = null,
  selectionDashOffset = 0,
  pastePreview = null,
}: RenderGridOptions): void {
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const gridPixelWidth = gridWidth * viewport.zoom;
  const gridPixelHeight = gridHeight * viewport.zoom;

  drawCheckerboard(
    ctx,
    viewport.panX,
    viewport.panY,
    gridPixelWidth,
    gridPixelHeight,
    tokens,
  );

  if (onionSkinPixels) {
    drawPixels(
      ctx,
      gridWidth,
      gridHeight,
      onionSkinPixels,
      paletteColors,
      viewport,
      onionSkinOpacity,
    );
  }

  drawPixels(ctx, gridWidth, gridHeight, pixels, paletteColors, viewport);

  if (colorFilters && hasActiveColorFilters(colorFilters)) {
    drawFilterPreview(
      ctx,
      gridWidth,
      gridHeight,
      pixels,
      paletteColors,
      viewport,
      colorFilters,
    );
  }

  if (showLightingMarkers && colorFilters && colorFilters.lightingPoints.length > 0) {
    drawLightingMarkers(ctx, colorFilters.lightingPoints, viewport);
  }

  drawGridLines(ctx, gridWidth, gridHeight, viewport, tokens);

  if (pastePreview) {
    drawPastePreview(ctx, pastePreview, paletteColors, viewport);
  }

  const activeSelection = selectionPreview ?? selection;
  if (activeSelection) {
    drawSelectionOutline(
      ctx,
      activeSelection,
      viewport,
      selectionDashOffset,
    );
  }
}

/** Repaint only affected cells during an active stroke (no full-canvas clear). */
export function repaintGridCells({
  ctx,
  gridWidth,
  gridHeight,
  basePixels,
  paletteColors,
  viewport,
  tokens,
  cells,
  previewByKey,
  onionSkinPixels,
  onionSkinOpacity = ONION_SKIN_OPACITY,
}: RepaintGridCellsOptions): void {
  for (const cell of cells) {
    const { x, y } = cell;
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) {
      continue;
    }

    drawCheckerCell(ctx, x, y, viewport, tokens);

    if (onionSkinPixels) {
      const onionIndex = onionSkinPixels[y * gridWidth + x] ?? TRANSPARENT_INDEX;
      drawPixelCell(
        ctx,
        x,
        y,
        onionIndex,
        paletteColors,
        viewport,
        onionSkinOpacity,
      );
    }

    const preview = previewByKey?.get(cellKey(x, y));
    const index = preview
      ? preview.next
      : (basePixels[y * gridWidth + x] ?? TRANSPARENT_INDEX);
    drawPixelCell(ctx, x, y, index, paletteColors, viewport);

    drawCellGridLines(ctx, x, y, gridWidth, gridHeight, viewport, tokens);
  }
}
