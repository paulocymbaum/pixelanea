import { describe, expect, it, vi, beforeEach } from "vitest";
import { prefetchFrameCache } from "@/components/animation/useAnimationPlayback";
import { useEditorStore } from "@/state/editorStore";
import * as framesApi from "@/api/frames";

describe("frame cache performance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prefetch completes without network when all frames are cached", async () => {
    const fetchFrame = vi.spyOn(framesApi, "fetchFrame");
    const pixels0 = new Uint8Array(64 * 64);
    const pixels1 = new Uint8Array(64 * 64);
    pixels1[0] = 2;

    useEditorStore.setState({
      projectId: "perf-project",
      frameCount: 2,
      activeFrameIndex: 0,
      pixels: pixels0,
      framePixelsByIndex: { 0: pixels0, 1: pixels1 },
      gridWidth: 64,
      gridHeight: 64,
    });

    await prefetchFrameCache("perf-project");

    expect(fetchFrame).not.toHaveBeenCalled();
    expect(useEditorStore.getState().framePixelsByIndex[1]?.[0]).toBe(2);
  });
});
