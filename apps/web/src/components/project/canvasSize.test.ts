import { describe, expect, it } from "vitest";
import {
  CANVAS_SIZE_MAX,
  CANVAS_SIZE_MIN,
  clampCanvasDimension,
  isPresetCanvasSize,
  isValidCanvasSize,
  parseCanvasDimensionInput,
} from "./canvasSize";

describe("canvasSize", () => {
  it("clamps dimensions to API bounds", () => {
    expect(clampCanvasDimension(0)).toBe(CANVAS_SIZE_MIN);
    expect(clampCanvasDimension(999)).toBe(CANVAS_SIZE_MAX);
    expect(clampCanvasDimension(48.7)).toBe(49);
  });

  it("parses integer dimension input", () => {
    expect(parseCanvasDimensionInput("48")).toBe(48);
    expect(parseCanvasDimensionInput(" 64 ")).toBe(64);
    expect(parseCanvasDimensionInput("")).toBeNull();
    expect(parseCanvasDimensionInput("abc")).toBeNull();
  });

  it("validates canvas size within bounds", () => {
    expect(isValidCanvasSize({ width: 48, height: 64 })).toBe(true);
    expect(isValidCanvasSize({ width: 0, height: 32 })).toBe(false);
    expect(isValidCanvasSize({ width: 32, height: 513 })).toBe(false);
  });

  it("detects preset square sizes", () => {
    expect(isPresetCanvasSize({ width: 32, height: 32 })).toBe(true);
    expect(isPresetCanvasSize({ width: 48, height: 64 })).toBe(false);
  });
});
