import { TRANSPARENT_INDEX } from "@/state/commands/types";

export type OffPaletteReport = {
  hasOffPalette: boolean;
  offPaletteCellCount: number;
  affectedFrameCount: number;
};

/** Count painted cells whose palette index is outside the current palette. */
export function countOffPalettePixels(
  pixels: Uint8Array,
  paletteLength: number,
): number {
  let count = 0;
  for (let i = 0; i < pixels.length; i++) {
    const index = pixels[i];
    if (index !== TRANSPARENT_INDEX && index >= paletteLength) {
      count++;
    }
  }
  return count;
}

/** Scan one or more frames and summarize off-palette usage. */
export function scanFramesForOffPalette(
  frames: readonly Uint8Array[],
  paletteLength: number,
): OffPaletteReport {
  let offPaletteCellCount = 0;
  let affectedFrameCount = 0;

  for (const frame of frames) {
    const frameCount = countOffPalettePixels(frame, paletteLength);
    if (frameCount > 0) {
      affectedFrameCount += 1;
      offPaletteCellCount += frameCount;
    }
  }

  return {
    hasOffPalette: offPaletteCellCount > 0,
    offPaletteCellCount,
    affectedFrameCount,
  };
}
