import { TRANSPARENT_INDEX } from "@/state/commands/types";
import { DEFAULT_PALETTE_COLORS } from "./palette";

type PixelLayerCacheEntry = {
  paletteColors: readonly string[];
  gridWidth: number;
  gridHeight: number;
  canvas: HTMLCanvasElement;
};

const cacheByPixels = new WeakMap<Uint8Array, PixelLayerCacheEntry>();

function cacheEntryMatches(
  entry: PixelLayerCacheEntry,
  paletteColors: readonly string[],
  gridWidth: number,
  gridHeight: number,
): boolean {
  return (
    entry.paletteColors === paletteColors &&
    entry.gridWidth === gridWidth &&
    entry.gridHeight === gridHeight
  );
}

function buildPixelLayerCanvas(
  pixels: Uint8Array,
  paletteColors: readonly string[],
  gridWidth: number,
  gridHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = gridWidth;
  canvas.height = gridHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Pixel layer cache 2D context unavailable");
  }

  const imageData = ctx.createImageData(gridWidth, gridHeight);
  const data = imageData.data;

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const index = pixels[y * gridWidth + x] ?? TRANSPARENT_INDEX;
      const offset = (y * gridWidth + x) * 4;
      if (index === TRANSPARENT_INDEX) {
        data[offset + 3] = 0;
        continue;
      }

      const hex = paletteColors[index] ?? DEFAULT_PALETTE_COLORS[0];
      const r = Number.parseInt(hex.slice(1, 3), 16);
      const g = Number.parseInt(hex.slice(3, 5), 16);
      const b = Number.parseInt(hex.slice(5, 7), 16);
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function getPixelLayerCanvas(
  pixels: Uint8Array,
  paletteColors: readonly string[],
  gridWidth: number,
  gridHeight: number,
): HTMLCanvasElement {
  const existing = cacheByPixels.get(pixels);
  if (existing && cacheEntryMatches(existing, paletteColors, gridWidth, gridHeight)) {
    return existing.canvas;
  }

  const canvas = buildPixelLayerCanvas(pixels, paletteColors, gridWidth, gridHeight);
  cacheByPixels.set(pixels, {
    paletteColors,
    gridWidth,
    gridHeight,
    canvas,
  });
  return canvas;
}

export function clearPixelLayerCache(): void {
  // WeakMap entries are released when pixel buffers are GC'd.
}

export function drawCachedPixelLayer(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8Array,
  paletteColors: readonly string[],
  gridWidth: number,
  gridHeight: number,
  panX: number,
  panY: number,
  zoom: number,
  opacity = 1,
): void {
  const source = getPixelLayerCanvas(pixels, paletteColors, gridWidth, gridHeight);
  const previousAlpha = ctx.globalAlpha;
  const previousSmoothing = ctx.imageSmoothingEnabled;

  if (opacity !== 1) {
    ctx.globalAlpha = opacity;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    source,
    0,
    0,
    gridWidth,
    gridHeight,
    panX,
    panY,
    gridWidth * zoom,
    gridHeight * zoom,
  );
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.globalAlpha = previousAlpha;
}
