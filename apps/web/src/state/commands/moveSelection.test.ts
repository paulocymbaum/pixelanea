import { describe, expect, it } from "vitest";
import { buildMoveSelectionChanges } from "@/state/commands/moveSelection";
import { TRANSPARENT_INDEX } from "@/state/commands/types";

describe("buildMoveSelectionChanges", () => {
  it("clears source and stamps clipboard at delta in one change list", () => {
    const pixels = new Uint8Array([
      1, 2, 0, 0,
      3, 4, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]);
    const selection = { x: 0, y: 0, width: 2, height: 2, shape: "rect" as const };

    const changes = buildMoveSelectionChanges(pixels, 4, 4, selection, 1, 0);

    const byKey = new Map(
      changes.map((change) => [`${change.x},${change.y}`, change]),
    );

    expect(byKey.get("0,0")?.next).toBe(TRANSPARENT_INDEX);
    expect(byKey.get("1,0")?.next).toBe(1);
    expect(byKey.get("0,1")?.next).toBe(TRANSPARENT_INDEX);
    expect(byKey.get("1,1")?.next).toBe(3);
    expect(byKey.get("2,0")?.next).toBe(2);
    expect(byKey.get("2,1")?.next).toBe(4);
    expect(byKey.get("3,0")?.next).toBeUndefined();
  });
});
