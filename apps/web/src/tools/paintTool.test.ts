import { describe, expect, it } from "vitest";
import { paintTool } from "./paintTool";

describe("paintTool", () => {
  it("exposes paint tool identity for registry", () => {
    expect(paintTool.id).toBe("paint");
    expect(paintTool.cursor).toBe("crosshair");
  });
});
