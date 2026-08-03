import { describe, expect, it } from "vitest";
import { resolveOnionSkinFrameIndex } from "./onionSkin";

describe("resolveOnionSkinFrameIndex", () => {
  it("returns the previous frame while editing", () => {
    expect(resolveOnionSkinFrameIndex(2, 8, false, 1)).toBe(1);
  });

  it("returns null on the first frame while editing", () => {
    expect(resolveOnionSkinFrameIndex(0, 8, false, 1)).toBeNull();
  });

  it("returns the previous frame while playing forward", () => {
    expect(resolveOnionSkinFrameIndex(3, 8, true, 1)).toBe(2);
  });

  it("returns the next frame while playing backward", () => {
    expect(resolveOnionSkinFrameIndex(2, 8, true, -1)).toBe(3);
  });

  it("shows the adjacent frame during playback turnarounds", () => {
    expect(resolveOnionSkinFrameIndex(0, 8, true, -1)).toBe(1);
    expect(resolveOnionSkinFrameIndex(7, 8, true, 1)).toBe(6);
  });
});
