import { describe, expect, it } from "vitest";
import {
  clampImportColorCount,
  importColorCountsForResolution,
} from "@/components/import/paletteImportOptions";

describe("paletteImportOptions", () => {
  it("scales color counts with resolution", () => {
    expect(importColorCountsForResolution(16)).toEqual([4, 8, 16]);
    expect(importColorCountsForResolution(64)).toEqual([4, 8, 16, 32]);
    expect(importColorCountsForResolution(128)).toEqual([4, 8, 16, 32, 64]);
  });

  it("clamps color count when resolution drops", () => {
    expect(clampImportColorCount(64, 128)).toBe(64);
    expect(clampImportColorCount(64, 32)).toBe(16);
    expect(clampImportColorCount(32, 16)).toBe(16);
  });
});
