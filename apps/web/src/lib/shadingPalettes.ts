export type ShadingStyle = "cell-shading" | "lighting" | "dark";

export const SHADING_STYLES: readonly ShadingStyle[] = [
  "cell-shading",
  "lighting",
  "dark",
] as const;

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

const HEX_PATTERN = /^#?([0-9A-Fa-f]{6})$/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseHex(hex: string): Rgb | null {
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

function rgbToHsl({ r, g, b }: Rgb): Hsl {
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

function hslToRgb({ h, s, l }: Hsl): Rgb {
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

function rgbToHex({ r, g, b }: Rgb): string {
  const toChannel = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${toChannel(r)}${toChannel(g)}${toChannel(b)}`.toUpperCase();
}

function hslToHex(hsl: Hsl): string {
  return rgbToHex(hslToRgb(hsl));
}

function uniqueColors(colors: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const color of colors) {
    const upper = color.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      result.push(upper);
    }
  }
  return result;
}

function buildRamp(
  base: Hsl,
  lightnessStops: number[],
  saturationScale = 1,
): string[] {
  return lightnessStops.map((lightness) =>
    hslToHex({
      h: base.h,
      s: clamp(base.s * saturationScale, 0, 1),
      l: clamp(lightness, 0, 1),
    }),
  );
}

function generateCellShadingPalette(base: Hsl): string[] {
  const bands = [
    clamp(base.l + 0.22, 0.08, 0.95),
    clamp(base.l + 0.08, 0.08, 0.95),
    base.l,
    clamp(base.l - 0.14, 0.05, 0.92),
    clamp(base.l - 0.28, 0.04, 0.88),
  ];
  return uniqueColors(buildRamp(base, bands, 1.05));
}

function generateLightingPalette(base: Hsl): string[] {
  const stops = [
    clamp(base.l + 0.28, 0.1, 0.98),
    clamp(base.l + 0.14, 0.1, 0.96),
    base.l,
    clamp(base.l - 0.12, 0.06, 0.9),
    clamp(base.l - 0.24, 0.04, 0.85),
    clamp(base.l - 0.36, 0.03, 0.8),
  ];
  return uniqueColors(buildRamp(base, stops, 1));
}

function generateDarkPalette(base: Hsl): string[] {
  const anchor = clamp(base.l * 0.72, 0.08, 0.55);
  const stops = [
    clamp(anchor + 0.1, 0.1, 0.62),
    anchor,
    clamp(anchor - 0.12, 0.06, 0.5),
    clamp(anchor - 0.24, 0.04, 0.42),
    clamp(anchor - 0.36, 0.03, 0.32),
  ];
  return uniqueColors(buildRamp(base, stops, 0.92));
}

/** Procedurally derive a shading ramp from a base hex color and lighting style. */
export function generateShadingPalette(
  baseHex: string,
  style: ShadingStyle,
): string[] {
  const rgb = parseHex(baseHex);
  if (!rgb) {
    return [];
  }

  const base = rgbToHsl(rgb);

  switch (style) {
    case "cell-shading":
      return generateCellShadingPalette(base);
    case "lighting":
      return generateLightingPalette(base);
    case "dark":
      return generateDarkPalette(base);
    default: {
      const exhaustive: never = style;
      return exhaustive;
    }
  }
}
