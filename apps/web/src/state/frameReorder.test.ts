import { describe, expect, it } from "vitest";
import { activeIndexAfterReorder } from "./frameReorder";

describe("activeIndexAfterReorder", () => {
  it("moves active frame when it was dragged", () => {
    expect(activeIndexAfterReorder(3, 3, 0)).toBe(0);
    expect(activeIndexAfterReorder(0, 0, 3)).toBe(3);
  });

  it("shifts indices when dragging over active frame", () => {
    expect(activeIndexAfterReorder(2, 0, 3)).toBe(1);
    expect(activeIndexAfterReorder(1, 3, 0)).toBe(2);
  });

  it("keeps index when unaffected", () => {
    expect(activeIndexAfterReorder(0, 1, 2)).toBe(0);
  });
});
