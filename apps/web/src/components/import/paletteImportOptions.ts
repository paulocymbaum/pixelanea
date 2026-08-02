import type { ResolutionPreset } from "./resolutionPresets";

/** How import wizard picks colors before pixelate. */
export type ImportPaletteMode = "style" | "image";

export type ImportColorCount = 4 | 8 | 16 | 32 | 64;

const BASE_COLOR_COUNTS: readonly ImportColorCount[] = [4, 8, 16];
const MID_COLOR_COUNTS: readonly ImportColorCount[] = [4, 8, 16, 32];
const HIGH_COLOR_COUNTS: readonly ImportColorCount[] = [4, 8, 16, 32, 64];

/** Color-count options scale with output resolution for higher-detail quantize. */
export function importColorCountsForResolution(
  resolution: ResolutionPreset,
): readonly ImportColorCount[] {
  if (resolution >= 128) {
    return HIGH_COLOR_COUNTS;
  }
  if (resolution >= 64) {
    return MID_COLOR_COUNTS;
  }
  return BASE_COLOR_COUNTS;
}

export function clampImportColorCount(
  count: ImportColorCount,
  resolution: ResolutionPreset,
): ImportColorCount {
  const allowed = importColorCountsForResolution(resolution);
  if (allowed.includes(count)) {
    return count;
  }
  return allowed[allowed.length - 1]!;
}
