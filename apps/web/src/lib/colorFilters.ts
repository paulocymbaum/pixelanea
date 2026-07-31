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

type Rgb = { r: number; g: number; b: number };

const HEX_PATTERN = /^#?([0-9A-Fa-f]{6})$/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseHex(hex: string): Rgb | null {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) {
    return null;
  }

  const value = match[1];
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) {
    rn = c;
    gn = x;
  } else if (h < 120) {
    rn = x;
    gn = c;
  } else if (h < 180) {
    gn = c;
    bn = x;
  } else if (h < 240) {
    gn = x;
    bn = c;
  } else if (h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
}

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
