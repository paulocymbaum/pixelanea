import { describe, expect, it } from "vitest";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import {
  buildSpritesheetRgba,
  exportFilename,
  exportGifFilename,
  exportSpritesheetFilename,
  framePixelsToRgba,
} from "./exportFrame";

describe("exportFilename", () => {
  it("builds frame filename from project name and index", () => {
    expect(exportFilename("My Art", 0)).toBe("My-Art-frame-1.png");
    expect(exportFilename("My Art", 7)).toBe("My-Art-frame-8.png");
  });

  it("falls back when name sanitizes to empty", () => {
    expect(exportFilename("   ", 2)).toBe("project-frame-3.png");
  });
});

describe("exportSpritesheetFilename", () => {
  it("builds spritesheet filename from project name", () => {
    expect(exportSpritesheetFilename("Walk Cycle")).toBe(
      "Walk-Cycle-spritesheet.png",
    );
  });

  it("falls back when name sanitizes to empty", () => {
    expect(exportSpritesheetFilename("   ")).toBe("project-spritesheet.png");
  });
});

describe("exportGifFilename", () => {
  it("builds GIF filename from project name", () => {
    expect(exportGifFilename("Walk Cycle")).toBe("Walk-Cycle-animation.gif");
  });

  it("falls back when name sanitizes to empty", () => {
    expect(exportGifFilename("   ")).toBe("project-animation.gif");
  });
});

describe("framePixelsToRgba", () => {
  it("maps palette indices and marks transparent cells", () => {
    const palette = ["#000000", "#ff0000", "#00ff00"];
    const pixels = new Uint8Array([TRANSPARENT_INDEX, 1, 2]);
    const rgba = framePixelsToRgba(pixels, 3, 1, palette);

    expect(rgba[3]).toBe(0);
    expect(rgba[4]).toBe(255);
    expect(rgba[5]).toBe(0);
    expect(rgba[8]).toBe(0);
    expect(rgba[9]).toBe(255);
  });
});

describe("buildSpritesheetRgba", () => {
  it("lays frames out horizontally", () => {
    const palette = ["#000000", "#ff0000", "#00ff00"];
    const frame0 = new Uint8Array([1, 2]);
    const frame1 = new Uint8Array([2, 1]);
    const { width, height, data } = buildSpritesheetRgba(
      [frame0, frame1],
      2,
      1,
      palette,
    );

    expect(width).toBe(4);
    expect(height).toBe(1);
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(0);
    expect(data[4]).toBe(0);
    expect(data[5]).toBe(255);
    expect(data[8]).toBe(0);
    expect(data[9]).toBe(255);
    expect(data[12]).toBe(255);
    expect(data[13]).toBe(0);
  });
});
