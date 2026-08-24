import { clamp, hslToRgb, parseHex, rgbToHsl, type Hsl, type Rgb } from "@/lib/colorMath";

export type ShadingStyle = "cell-shading" | "lighting" | "dark";

export const SHADING_STYLES: readonly ShadingStyle[] = [
  "cell-shading",
  "lighting",
  "dark",
] as const;

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
