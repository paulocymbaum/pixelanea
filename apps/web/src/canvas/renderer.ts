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
import { DEFAULT_PALETTE_COLORS } from "./palette";

export type CanvasTokens = {
  checkerA: string;
  checkerB: string;
  gridLine: string;
};

export const ONION_SKIN_OPACITY = 0.3;

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
};

const CHECKER_CELL_PX = 8;

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
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
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
}
