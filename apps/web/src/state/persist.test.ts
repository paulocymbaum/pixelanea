import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";
import { flushFrameSync } from "./persist";

vi.mock("@/api/frames", () => ({
  saveFrame: vi.fn().mockResolvedValue({ ok: true }),
}));

import { saveFrame } from "@/api/frames";

describe("persist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.setState({
      projectId: "test-project",
      gridWidth: 2,
      gridHeight: 2,
      pixels: new Uint8Array([0, 1, 2, 3]),
      isDirty: true,
      syncStatus: "idle",
    });
  });

  it("syncs dirty frame to backend", async () => {
    await flushFrameSync();

    expect(saveFrame).toHaveBeenCalledWith(
      "test-project",
      0,
      expect.any(Uint8Array),
    );
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("skips sync when not dirty", async () => {
    useEditorStore.setState({ isDirty: false });
    await flushFrameSync();
    expect(saveFrame).not.toHaveBeenCalled();
  });
});
