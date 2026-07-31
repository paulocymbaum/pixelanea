import { describe, expect, it } from "vitest";
import {
  applyColorOverlay,
  computeFilterCellChanges,
  computeFilteredRgb,
  findNearestPaletteIndex,
  hasActiveColorFilters,
  lightingInfluenceAt,
  parseHex,
} from "./colorFilters";
import { TRANSPARENT_INDEX } from "@/state/commands/types";

describe("colorFilters", () => {
  it("blends overlay with opacity", () => {
    const base = { r: 100, g: 100, b: 100 };
    const overlay = { r: 200, g: 0, b: 0 };
    const result = applyColorOverlay(base, overlay, 0.5);
    expect(result).toEqual({ r: 150, g: 50, b: 50 });
  });

  it("computes radial lighting falloff", () => {
    const center = lightingInfluenceAt(5, 5, {
      x: 5,
      y: 5,
      radius: 4,
      intensity: 1,
    });
    const edge = lightingInfluenceAt(9, 5, {
      x: 5,
      y: 5,
      radius: 4,
      intensity: 1,
    });
    const outside = lightingInfluenceAt(10, 5, {
      x: 5,
      y: 5,
      radius: 4,
      intensity: 1,
    });

    expect(center).toBe(1);
    expect(edge).toBe(0);
    expect(outside).toBe(0);
  });

  it("brightens pixels near a lighting point", () => {
    const rgb = parseHex("#404040")!;
    const settings = {
      overlayEnabled: false,
      overlayColor: "#000000",
      overlayOpacity: 0,
      lightingPoints: [
        { id: "a", x: 0, y: 0, radius: 5, intensity: 1 },
      ],
    };

    const atCenter = computeFilteredRgb(0, 0, rgb, settings);
    const farAway = computeFilteredRgb(20, 20, rgb, settings);

    const centerBrightness = atCenter.r + atCenter.g + atCenter.b;
    const farBrightness = farAway.r + farAway.g + farAway.b;
    expect(centerBrightness).toBeGreaterThan(farBrightness);
  });

  it("detects active filters", () => {
    expect(
      hasActiveColorFilters({
        overlayEnabled: true,
        overlayColor: "#ff0000",
        overlayOpacity: 0.2,
        lightingPoints: [],
      }),
    ).toBe(true);

    expect(
      hasActiveColorFilters({
        overlayEnabled: false,
        overlayColor: "#ff0000",
        overlayOpacity: 0,
        lightingPoints: [
          { id: "a", x: 0, y: 0, radius: 3, intensity: 0.5 },
        ],
      }),
    ).toBe(true);

    expect(
      hasActiveColorFilters({
        overlayEnabled: false,
        overlayColor: "#ff0000",
        overlayOpacity: 0,
        lightingPoints: [],
      }),
    ).toBe(false);
  });

  it("maps filtered RGB to nearest palette index", () => {
    const palette = ["#000000", "#ff0000", "#00ff00", "#0000ff"];
    const index = findNearestPaletteIndex({ r: 250, g: 10, b: 10 }, palette);
    expect(index).toBe(1);
  });

  it("skips transparent cells when computing changes", () => {
    const pixels = new Uint8Array([TRANSPARENT_INDEX, 1]);
    const changes = computeFilterCellChanges(
      pixels,
      2,
      1,
      ["#000000", "#404040", "#ffffff"],
      {
        overlayEnabled: true,
        overlayColor: "#ffffff",
        overlayOpacity: 1,
        lightingPoints: [],
      },
    );

    expect(changes.some((change) => change.x === 0)).toBe(false);
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes.every((change) => change.x === 1)).toBe(true);
  });
});
