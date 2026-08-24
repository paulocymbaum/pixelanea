import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PREFETCH_FRAME_CONCURRENCY,
  prefetchFrameCache,
} from "@/components/animation/useAnimationPlayback";
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

  it("limits concurrent frame fetches during prefetch", async () => {
    expect(PREFETCH_FRAME_CONCURRENCY).toBeGreaterThan(0);

    let inFlight = 0;
    let maxInFlight = 0;

    vi.spyOn(framesApi, "fetchFrame").mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return {
        ok: true as const,
        index: 0,
        width: 8,
        height: 8,
        updatedAt: "now",
        pixels: new Uint8Array(64),
      };
    });

    const pixels0 = new Uint8Array(64);
    useEditorStore.setState({
      projectId: "perf-project",
      frameCount: 12,
      activeFrameIndex: 0,
      pixels: pixels0,
      framePixelsByIndex: { 0: pixels0 },
      gridWidth: 8,
      gridHeight: 8,
    });

    await prefetchFrameCache("perf-project");

    expect(maxInFlight).toBeLessThanOrEqual(PREFETCH_FRAME_CONCURRENCY);
    expect(framesApi.fetchFrame).toHaveBeenCalledTimes(11);
  });
});
