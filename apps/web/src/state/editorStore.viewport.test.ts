import { describe, expect, it } from "vitest";
import { fitToView } from "@/canvas/coordinates";
import { useEditorStore } from "@/state/editorStore";
import { useViewportStore } from "@/state/viewportStore";

describe("viewportStore", () => {
  it("marks viewport as user-adjusted after manual zoom", () => {
    useEditorStore.setState({
      gridWidth: 32,
      gridHeight: 32,
    });
    useViewportStore.setState({
      zoom: 1,
      panX: 0,
      panY: 0,
      viewportUserAdjusted: false,
      containerSize: { width: 400, height: 300 },
    });

    useViewportStore.getState().zoomIn({ x: 200, y: 150 });
    expect(useViewportStore.getState().viewportUserAdjusted).toBe(true);
    expect(useViewportStore.getState().zoom).toBeGreaterThan(1);
  });

  it("clears user-adjusted flag on explicit fitToView", () => {
    useEditorStore.setState({
      gridWidth: 32,
      gridHeight: 32,
    });
    useViewportStore.setState({
      zoom: 8,
      panX: 12,
      panY: 8,
      viewportUserAdjusted: true,
      containerSize: { width: 400, height: 300 },
    });

    const { containerSize, gridWidth, gridHeight } = {
      containerSize: useViewportStore.getState().containerSize,
      gridWidth: useEditorStore.getState().gridWidth,
      gridHeight: useEditorStore.getState().gridHeight,
    };
    useViewportStore.getState().fitToView(undefined, gridWidth, gridHeight);
    const state = useViewportStore.getState();
    const fitted = fitToView(containerSize, gridWidth, gridHeight);
    expect(state.viewportUserAdjusted).toBe(false);
    expect(state.zoom).toBeCloseTo(fitted.zoom, 5);
  });

  it("setViewport from wheel zoom preserves user-adjusted flag", () => {
    useViewportStore.setState({
      zoom: 2,
      panX: 10,
      panY: 20,
      viewportUserAdjusted: false,
    });

    useViewportStore.getState().setViewport({ zoom: 4, panX: 5, panY: 15 });
    expect(useViewportStore.getState().viewportUserAdjusted).toBe(true);
    expect(useViewportStore.getState().zoom).toBe(4);
  });
});
