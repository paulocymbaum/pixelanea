import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViewportStore } from "@/state/viewportStore";
import { useViewportInteraction } from "./useViewportInteraction";

describe("useViewportInteraction", () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  let setViewportSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    useViewportStore.setState({
      zoom: 2,
      panX: 10,
      panY: 20,
      viewportUserAdjusted: false,
      containerSize: { width: 400, height: 300 },
    });
    setViewportSpy = vi.spyOn(useViewportStore.getState(), "setViewport");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    rafCallbacks = [];
  });

  function flushRaf() {
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of callbacks) {
      callback(0);
    }
  }

  function createCanvasRefs() {
    const canvas = document.createElement("canvas");
    const overlay = document.createElement("canvas");
    const canvasRef = { current: canvas };
    const overlayRef = { current: overlay };
    return { canvas, overlay, canvasRef, overlayRef };
  }

  it("coalesces rapid wheel events into one setViewport per animation frame", () => {
    const { canvasRef, overlayRef, canvas } = createCanvasRefs();
    renderHook(() => useViewportInteraction(canvasRef, overlayRef));

    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    act(() => {
      canvas.dispatchEvent(
        new WheelEvent("wheel", { deltaY: -100, clientX: 100, clientY: 100 }),
      );
      canvas.dispatchEvent(
        new WheelEvent("wheel", { deltaY: -100, clientX: 100, clientY: 100 }),
      );
      canvas.dispatchEvent(
        new WheelEvent("wheel", { deltaY: -100, clientX: 100, clientY: 100 }),
      );
    });

    expect(setViewportSpy).not.toHaveBeenCalled();

    act(() => {
      flushRaf();
    });

    expect(setViewportSpy).toHaveBeenCalledTimes(1);
  });

  it("commits pan on pointer up without intermediate setViewport calls", () => {
    const { canvasRef, overlayRef } = createCanvasRefs();
    const { result, unmount } = renderHook(() =>
      useViewportInteraction(canvasRef, overlayRef),
    );
    setViewportSpy.mockClear();

    act(() => {
      result.current.onPanMove(120, 140, {
        startX: 100,
        startY: 100,
        panX: 10,
        panY: 20,
        zoom: 2,
      });
    });

    expect(setViewportSpy).not.toHaveBeenCalled();
    expect(canvasRef.current?.style.transform).toBe("translate(20px, 40px)");

    act(() => {
      result.current.onPanCommit(120, 140, {
        startX: 100,
        startY: 100,
        panX: 10,
        panY: 20,
        zoom: 2,
      });
    });

    expect(setViewportSpy).toHaveBeenCalledTimes(1);
    expect(setViewportSpy).toHaveBeenCalledWith({
      zoom: 2,
      panX: 30,
      panY: 60,
    });
    expect(canvasRef.current?.style.transform).toBe("");
    unmount();
  });

  it("clears pan preview transform on preview end", () => {
    const { canvasRef, overlayRef } = createCanvasRefs();
    const { result } = renderHook(() =>
      useViewportInteraction(canvasRef, overlayRef),
    );

    act(() => {
      result.current.onPanMove(110, 115, {
        startX: 100,
        startY: 100,
        panX: 0,
        panY: 0,
        zoom: 1,
      });
      result.current.onPanPreviewEnd();
    });

    expect(canvasRef.current?.style.transform).toBe("");
    expect(overlayRef.current?.style.transform).toBe("");
  });
});
