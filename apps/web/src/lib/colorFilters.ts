import { clamp, hslToRgb, parseHex, rgbToHsl, type Rgb } from "@/lib/colorMath";
import { TRANSPARENT_INDEX } from "@/state/commands/types";

export type LightingPoint = {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
};

export type ColorFilterSettings = {
  overlayEnabled: boolean;
  overlayColor: string;
  overlayOpacity: number;
  lightingPoints: readonly LightingPoint[];
};

export const DEFAULT_COLOR_FILTER_SETTINGS: ColorFilterSettings = {
  overlayEnabled: false,
  overlayColor: "#FF6B35",
  overlayOpacity: 0.25,
  lightingPoints: [],
};

export const LIGHTING_RADIUS_MIN = 1;
export const LIGHTING_RADIUS_MAX = 32;
export const LIGHTING_INTENSITY_MIN = -1;
export const LIGHTING_INTENSITY_MAX = 1;

export { parseHex };

export function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)})`;
}

/** Alpha-blend an opaque overlay tint onto an RGB color. */
export function applyColorOverlay(
  rgb: Rgb,
  overlay: Rgb,
  opacity: number,
): Rgb {
  const alpha = clamp(opacity, 0, 1);
  return {
    r: rgb.r * (1 - alpha) + overlay.r * alpha,
    g: rgb.g * (1 - alpha) + overlay.g * alpha,
    b: rgb.b * (1 - alpha) + overlay.b * alpha,
  };
}

/** Radial falloff from a lighting point center (grid cells). Returns -1..1 influence. */
export function lightingInfluenceAt(
  cellX: number,
  cellY: number,
  point: Pick<LightingPoint, "x" | "y" | "radius" | "intensity">,
): number {
  const radius = Math.max(point.radius, LIGHTING_RADIUS_MIN);
  const dx = cellX - point.x;
  const dy = cellY - point.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > radius) {
    return 0;
  }

  const falloff = 1 - distance / radius;
  return falloff * clamp(point.intensity, LIGHTING_INTENSITY_MIN, LIGHTING_INTENSITY_MAX);
}

/** Apply summed lighting influence as a subtle HSL lightness shift. */
export function applyLighting(rgb: Rgb, totalInfluence: number): Rgb {
  if (totalInfluence === 0) {
    return rgb;
  }

  const hsl = rgbToHsl(rgb);
  const shift = totalInfluence * 0.35;
  const nextL = clamp(hsl.l + shift, 0, 1);
  return hslToRgb(hsl.h, hsl.s, nextL);
}

export function computeFilteredRgb(
  cellX: number,
  cellY: number,
  rgb: Rgb,
  settings: ColorFilterSettings,
): Rgb {
  let result = rgb;

  if (settings.overlayEnabled && settings.overlayOpacity > 0) {
    const overlay = parseHex(settings.overlayColor);
    if (overlay) {
      result = applyColorOverlay(result, overlay, settings.overlayOpacity);
    }
  }

  let lightingSum = 0;
  for (const point of settings.lightingPoints) {
    lightingSum += lightingInfluenceAt(cellX, cellY, point);
  }
  lightingSum = clamp(lightingSum, LIGHTING_INTENSITY_MIN, LIGHTING_INTENSITY_MAX);

  return applyLighting(result, lightingSum);
}

export function colorDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Map an RGB value to the nearest palette index (skips transparent index 0). */
export function findNearestPaletteIndex(
  rgb: Rgb,
  paletteColors: readonly string[],
): number {
  let bestIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < paletteColors.length; index++) {
    const paletteRgb = parseHex(paletteColors[index] ?? "");
    if (!paletteRgb) {
      continue;
    }

    const distance = colorDistance(rgb, paletteRgb);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function hasActiveColorFilters(settings: ColorFilterSettings): boolean {
  if (settings.overlayEnabled && settings.overlayOpacity > 0) {
    return true;
  }

  return settings.lightingPoints.some(
    (point) => point.radius > 0 && point.intensity !== 0,
  );
}

export type FilterCellChange = {
  x: number;
  y: number;
  previous: number;
  next: number;
};

/** Compute palette-quantized pixel changes after applying filters. */
export function computeFilterCellChanges(
  pixels: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  paletteColors: readonly string[],
  settings: ColorFilterSettings,
): FilterCellChange[] {
  if (!hasActiveColorFilters(settings)) {
    return [];
  }

  const changes: FilterCellChange[] = [];

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const offset = y * gridWidth + x;
      const previous = pixels[offset] ?? TRANSPARENT_INDEX;
      if (previous === TRANSPARENT_INDEX) {
        continue;
      }

      const sourceRgb = parseHex(paletteColors[previous] ?? "");
      if (!sourceRgb) {
        continue;
      }

      const filtered = computeFilteredRgb(x, y, sourceRgb, settings);
      const next = findNearestPaletteIndex(filtered, paletteColors);
      if (next !== previous) {
        changes.push({ x, y, previous, next });
      }
    }
  }

  return changes;
}
