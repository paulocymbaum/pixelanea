import { vi } from "vitest";

/** jsdom stubs for Canvas + ResizeObserver used by editor integration tests. */
export function stubCanvasEnvironment() {
  class ResizeObserverMock {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);

  const createImageData = (width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  });

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    (type) => {
      if (type !== "2d") {
        return null;
      }
      return {
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        createImageData: vi.fn(createImageData),
        putImageData: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    },
  );

  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
}
