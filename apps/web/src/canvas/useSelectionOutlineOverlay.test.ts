import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSelectionOutlineOverlay } from "./useSelectionOutlineOverlay";

describe("useSelectionOutlineOverlay", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          setTransform: vi.fn(),
          clearRect: vi.fn(),
          strokeRect: vi.fn(),
          beginPath: vi.fn(),
          ellipse: vi.fn(),
          stroke: vi.fn(),
          getLineDash: vi.fn(() => []),
          setLineDash: vi.fn(),
          lineDashOffset: 0,
          lineWidth: 1,
        }) as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pauses marching ants while viewport interaction is active", () => {
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 1);

    const container = document.createElement("div");
    const overlay = document.createElement("canvas");
    Object.defineProperty(container, "clientWidth", { value: 200 });
    Object.defineProperty(container, "clientHeight", { value: 200 });

    const containerRef = { current: container };
    const overlayCanvasRef = { current: overlay };

    const { rerender } = renderHook(
      (props: { isViewportInteracting: boolean }) =>
        useSelectionOutlineOverlay({
          overlayCanvasRef,
          containerRef,
          selection: { x: 0, y: 0, width: 2, height: 2, shape: "rect" },
          selectionPreview: null,
          movePreview: null,
          pastePreview: null,
          zoom: 8,
          panX: 0,
          panY: 0,
          isViewportInteracting: props.isViewportInteracting,
        }),
      { initialProps: { isViewportInteracting: false } },
    );

    expect(rafSpy).toHaveBeenCalled();

    rafSpy.mockClear();
    rerender({ isViewportInteracting: true });

    expect(rafSpy).not.toHaveBeenCalled();
  });
});
