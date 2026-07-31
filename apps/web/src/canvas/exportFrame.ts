import { TRANSPARENT_INDEX } from "@/state/commands/types";

export type ExportFrameOptions = {
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  paletteColors: readonly string[];
  filename: string;
};

export type ExportSpritesheetOptions = {
  frames: readonly Uint8Array[];
  gridWidth: number;
  gridHeight: number;
  paletteColors: readonly string[];
  filename: string;
};

function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = hex.trim();
  const match = /^#?([0-9A-Fa-f]{6})$/.exec(normalized);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function sanitizeProjectBase(projectName: string): string {
  return (
    projectName
      .trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

/** Sanitize a project name for use in a downloaded filename. */
export function exportFilename(
  projectName: string,
  frameIndex: number,
): string {
  return `${sanitizeProjectBase(projectName)}-frame-${frameIndex + 1}.png`;
}

/** Filename for a horizontal spritesheet of all frames. */
export function exportSpritesheetFilename(projectName: string): string {
  return `${sanitizeProjectBase(projectName)}-spritesheet.png`;
}

/** Filename for an animated GIF of all frames. */
export function exportGifFilename(projectName: string): string {
  return `${sanitizeProjectBase(projectName)}-animation.gif`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Map palette-indexed frame pixels to RGBA (transparent index → alpha 0). */
export function framePixelsToRgba(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  paletteColors: readonly string[],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(gridWidth * gridHeight * 4);

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const paletteIndex = pixels[y * gridWidth + x] ?? TRANSPARENT_INDEX;
      const offset = (y * gridWidth + x) * 4;

      if (paletteIndex === TRANSPARENT_INDEX) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }

      const hex = paletteColors[paletteIndex] ?? "#000000";
      const rgb = parseHexColor(hex) ?? [0, 0, 0];
      data[offset] = rgb[0];
      data[offset + 1] = rgb[1];
      data[offset + 2] = rgb[2];
      data[offset + 3] = 255;
    }
  }

  return data;
}

/** Compose frames left-to-right into one RGBA buffer (horizontal spritesheet). */
export function buildSpritesheetRgba(
  frames: readonly Uint8Array[],
  gridWidth: number,
  gridHeight: number,
  paletteColors: readonly string[],
): { width: number; height: number; data: Uint8ClampedArray } {
  const frameCount = frames.length;
  const width = gridWidth * frameCount;
  const height = gridHeight;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const frameRgba = framePixelsToRgba(
      frames[frameIndex],
      gridWidth,
      gridHeight,
      paletteColors,
    );
    const xOffset = frameIndex * gridWidth;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const srcOffset = (y * gridWidth + x) * 4;
        const dstOffset = (y * width + (xOffset + x)) * 4;
        data[dstOffset] = frameRgba[srcOffset];
        data[dstOffset + 1] = frameRgba[srcOffset + 1];
        data[dstOffset + 2] = frameRgba[srcOffset + 2];
        data[dstOffset + 3] = frameRgba[srcOffset + 3];
      }
    }
  }

  return { width, height, data };
}

function downloadPngFromRgba(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  filename: string,
): void {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/**
 * Renders the active frame at native grid resolution (no checkerboard or grid lines)
 * and triggers a PNG download in the browser.
 */
export function exportFrameToPng({
  pixels,
  gridWidth,
  gridHeight,
  paletteColors,
  filename,
}: ExportFrameOptions): void {
  const rgba = framePixelsToRgba(
    pixels,
    gridWidth,
    gridHeight,
    paletteColors,
  );
  downloadPngFromRgba(gridWidth, gridHeight, rgba, filename);
}

/**
 * Renders all frames in a horizontal strip at native grid resolution
 * and triggers a PNG download in the browser.
 */
export function exportSpritesheetToPng({
  frames,
  gridWidth,
  gridHeight,
  paletteColors,
  filename,
}: ExportSpritesheetOptions): void {
  const { width, height, data } = buildSpritesheetRgba(
    frames,
    gridWidth,
    gridHeight,
    paletteColors,
  );
  downloadPngFromRgba(width, height, data, filename);
}
