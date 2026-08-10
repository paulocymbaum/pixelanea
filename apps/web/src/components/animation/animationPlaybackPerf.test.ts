import { describe, expect, it } from "vitest";
import { clampAnimationFps } from "@/state/editorStorePlayback";

/** Deterministic FPS bounds for RAF playback scheduling. */
describe("animation playback performance", () => {
  it("clamps FPS to 1-24 and yields stable frame intervals", () => {
    expect(clampAnimationFps(0)).toBe(1);
    expect(clampAnimationFps(100)).toBe(24);
    expect(1000 / clampAnimationFps(24)).toBeCloseTo(41.67, 1);
    expect(1000 / clampAnimationFps(12)).toBeCloseTo(83.33, 1);
    expect(1000 / clampAnimationFps(1)).toBe(1000);
  });
});
