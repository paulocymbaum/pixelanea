import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";
import { buildFrameCache } from "@/qa/animationMatrixHarness";

describe("editorStorePlayback", () => {
  beforeEach(() => {
    const cache = buildFrameCache(4);
    useEditorStore.setState({
      frameCount: 4,
      activeFrameIndex: 0,
      isPlaying: false,
      readOnly: false,
      animationLoop: false,
      animationBoomerang: false,
      playbackDirection: 1 as const,
      framePixelsByIndex: cache,
      pixels: new Uint8Array(cache[0]!),
      gridWidth: 8,
      gridHeight: 8,
    });
  });

  it("preparePlaybackStart rewinds from the last frame when loop is off", () => {
    useEditorStore.setState({ activeFrameIndex: 3, pixels: new Uint8Array(64) });
    useEditorStore.getState().preparePlaybackStart();

    expect(useEditorStore.getState().activeFrameIndex).toBe(0);
    expect(useEditorStore.getState().pixels[0]).toBe(1);
  });

  it("preparePlaybackStart keeps the current frame when not on the last frame", () => {
    useEditorStore.setState({ activeFrameIndex: 2 });
    useEditorStore.getState().preparePlaybackStart();

    expect(useEditorStore.getState().activeFrameIndex).toBe(2);
  });

  it("advancePlaybackFrame stops on the last frame when loop is off", () => {
    useEditorStore.setState({
      activeFrameIndex: 3,
      isPlaying: true,
      readOnly: true,
    });

    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(false);
    expect(useEditorStore.getState().isPlaying).toBe(false);
    expect(useEditorStore.getState().readOnly).toBe(false);
    expect(useEditorStore.getState().activeFrameIndex).toBe(3);
  });

  it("advancePlaybackFrame advances through frames when loop is off", () => {
    useEditorStore.setState({ isPlaying: true, readOnly: true });

    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(1);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(2);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(3);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(false);
    expect(useEditorStore.getState().isPlaying).toBe(false);
  });

  it("advancePlaybackFrame uses an empty buffer when the next frame is uncached", () => {
    useEditorStore.setState({
      framePixelsByIndex: { 0: buildFrameCache(1)[0]! },
      isPlaying: true,
      readOnly: true,
    });

    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(1);
    expect(useEditorStore.getState().framePixelsByIndex[1]).toBeDefined();
  });

  it("advancePlaybackFrame ping-pongs when boomerang is on", () => {
    useEditorStore.setState({
      animationBoomerang: true,
      animationLoop: true,
      isPlaying: true,
      readOnly: true,
    });

    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(1);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(2);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(3);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(2);
    expect(useEditorStore.getState().playbackDirection).toBe(-1);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(1);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(0);
    expect(useEditorStore.getState().advancePlaybackFrame()).toBe(true);
    expect(useEditorStore.getState().activeFrameIndex).toBe(1);
    expect(useEditorStore.getState().playbackDirection).toBe(1);
    expect(useEditorStore.getState().isPlaying).toBe(true);
  });

  it("setAnimationLoop disables boomerang", () => {
    useEditorStore.setState({ animationBoomerang: true });
    useEditorStore.getState().setAnimationLoop(true);
    expect(useEditorStore.getState().animationBoomerang).toBe(false);
  });
});
