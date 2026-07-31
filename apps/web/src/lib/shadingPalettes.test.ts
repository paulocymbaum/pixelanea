import { describe, expect, it } from "vitest";
import {
  generateShadingPalette,
  SHADING_STYLES,
} from "./shadingPalettes";

const HEX_PATTERN = /^#[0-9A-F]{6}$/;

describe("generateShadingPalette", () => {
  it.each(SHADING_STYLES)("returns normalized hex colors for %s", (style) => {
    const shades = generateShadingPalette("#4488CC", style);

    expect(shades.length).toBeGreaterThanOrEqual(3);
    for (const shade of shades) {
      expect(shade).toMatch(HEX_PATTERN);
    }
  });

  it("orders lighting shades from lighter to darker", () => {
    const shades = generateShadingPalette("#808080", "lighting");

    const parseLightness = (hex: string) => {
      const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
      const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
      const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return (max + min) / 2;
    };

    const lightness = shades.map(parseLightness);
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]).toBeLessThanOrEqual(lightness[i - 1] + 0.001);
    }
  });

  it("produces fewer highlight steps for dark style than lighting", () => {
    const lighting = generateShadingPalette("#6699DD", "lighting");
    const dark = generateShadingPalette("#6699DD", "dark");

    const maxLighting = Math.max(
      ...lighting.map((hex) => Number.parseInt(hex.slice(1, 3), 16)),
    );
    const maxDark = Math.max(
      ...dark.map((hex) => Number.parseInt(hex.slice(1, 3), 16)),
    );

    expect(maxDark).toBeLessThan(maxLighting);
  });

  it("returns discrete bands for cell-shading", () => {
    const shades = generateShadingPalette("#FF6600", "cell-shading");
    expect(shades.length).toBeGreaterThanOrEqual(4);
    expect(new Set(shades).size).toBe(shades.length);
  });

  it("returns an empty array for invalid hex", () => {
    expect(generateShadingPalette("not-a-color", "lighting")).toEqual([]);
    expect(generateShadingPalette("#12", "dark")).toEqual([]);
  });

  it("accepts hex without a leading hash", () => {
    const withHash = generateShadingPalette("#AABBCC", "lighting");
    const withoutHash = generateShadingPalette("AABBCC", "lighting");
    expect(withoutHash).toEqual(withHash);
  });
});
