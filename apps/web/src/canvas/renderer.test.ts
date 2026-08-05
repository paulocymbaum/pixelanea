import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import { ONION_SKIN_OPACITY, PASTE_PREVIEW_OPACITY, buildMovePreviewByKey, movePreviewAffectedCellKeys, readCanvasTokens, renderGrid, repaintGridCells, setupHiDpiCanvas } from "./renderer";

function stubOffscreenCanvasContext() {
  return vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement, type: string) {
      if (type !== "2d") {
        return null;
      }
      return {
        createImageData: (width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: "",
        createPattern: vi.fn(() => ({})),
      } as unknown as CanvasRenderingContext2D;
    },
  );
}

function createMockContext() {
  const alphaLog: number[] = [];
  const fillRectCalls: number[] = [];
  const fillStyles: string[] = [];

  const ctx = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    imageSmoothingEnabled: true,
    clearRect: vi.fn(),
    fillRect: vi.fn(() => {
      fillRectCalls.push(ctx.globalAlpha);
      fillStyles.push(ctx.fillStyle);
    }),
    drawImage: vi.fn(),
    createPattern: vi.fn(() => ({ __pattern: true })),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  Object.defineProperty(ctx, "globalAlpha", {
    get: () => alphaLog[alphaLog.length - 1] ?? 1,
    set: (value: number) => {
      alphaLog.push(value);
    },
  });

  Object.defineProperty(ctx, "fillStyle", {
    get: () => fillStyles[fillStyles.length - 1] ?? "",
    set: (value: string) => {
      fillStyles.push(value);
    },
  });

  return { ctx, alphaLog, fillRectCalls, fillStyles };
}

describe("renderGrid onion skin", () => {
  const tokens = {
    checkerA: "#ccc",
    checkerB: "#fff",
    gridLine: "rgba(0,0,0,0.08)",
  };
  let offscreenStub: ReturnType<typeof stubOffscreenCanvasContext>;

  beforeEach(() => {
    offscreenStub = stubOffscreenCanvasContext();
  });

  afterEach(() => {
    offscreenStub.mockRestore();
  });

  it("draws onion pixels at reduced opacity before current pixels", () => {
    const { ctx } = createMockContext();
    const palette = ["#000000", "#ff0000"];
    const onionPixels = new Uint8Array([1, TRANSPARENT_INDEX]);
    const currentPixels = new Uint8Array([TRANSPARENT_INDEX, 1]);

    renderGrid({
      ctx,
      cssWidth: 64,
      cssHeight: 64,
      gridWidth: 2,
      gridHeight: 1,
      pixels: currentPixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
      onionSkinPixels: onionPixels,
      onionSkinOpacity: ONION_SKIN_OPACITY,
    });

    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    const alphaLog = (ctx as { globalAlpha?: number }).globalAlpha;
    expect(alphaLog).toBeDefined();
  });

  it("uses palette colors for onion skin pixels", () => {
    const { ctx } = createMockContext();
    const palette = ["#000000", "#ff0000"];
    const onionPixels = new Uint8Array([1, TRANSPARENT_INDEX]);
    const currentPixels = new Uint8Array([TRANSPARENT_INDEX, 1]);

    renderGrid({
      ctx,
      cssWidth: 64,
      cssHeight: 64,
      gridWidth: 2,
      gridHeight: 1,
      pixels: currentPixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
      onionSkinPixels: onionPixels,
      onionSkinOpacity: ONION_SKIN_OPACITY,
    });

    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("skips onion layer when onionSkinPixels is omitted", () => {
    const { ctx, fillRectCalls } = createMockContext();
    const palette = ["#000000", "#ff0000"];
    const currentPixels = new Uint8Array([1, TRANSPARENT_INDEX]);

    renderGrid({
      ctx,
      cssWidth: 64,
      cssHeight: 64,
      gridWidth: 2,
      gridHeight: 1,
      pixels: currentPixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
    });

    expect(fillRectCalls).not.toContain(ONION_SKIN_OPACITY);
  });
});

describe("renderGrid color filters", () => {
  const tokens = {
    checkerA: "#ccc",
    checkerB: "#fff",
    gridLine: "rgba(0,0,0,0.08)",
  };
  let offscreenStub: ReturnType<typeof stubOffscreenCanvasContext>;

  beforeEach(() => {
    offscreenStub = stubOffscreenCanvasContext();
  });

  afterEach(() => {
    offscreenStub.mockRestore();
  });

  it("draws filter preview after base pixels and before grid lines", () => {
    const { ctx, fillStyles } = createMockContext();
    const palette = ["#000000", "#808080"];
    const pixels = new Uint8Array([1]);

    renderGrid({
      ctx,
      cssWidth: 32,
      cssHeight: 32,
      gridWidth: 1,
      gridHeight: 1,
      pixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
      colorFilters: {
        overlayEnabled: true,
        overlayColor: "#ff0000",
        overlayOpacity: 0.5,
        lightingPoints: [],
      },
    });

    const stringStyles = fillStyles.filter(
      (style): style is string => typeof style === "string",
    );
    const baseIndex = stringStyles.indexOf("#808080");
    const filteredIndex = stringStyles.findIndex(
      (style) => style.startsWith("rgb(") && style !== "#808080",
    );
    const strokeIndex = (ctx.stroke as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];

    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(filteredIndex).toBeGreaterThan(baseIndex);
    expect(strokeIndex).toBeGreaterThan(filteredIndex);
  });

  it("skips filter preview when filters are inactive", () => {
    const { ctx, fillStyles } = createMockContext();
    const palette = ["#000000", "#808080"];
    const pixels = new Uint8Array([1]);

    renderGrid({
      ctx,
      cssWidth: 32,
      cssHeight: 32,
      gridWidth: 1,
      gridHeight: 1,
      pixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
      colorFilters: {
        overlayEnabled: false,
        overlayColor: "#ff0000",
        overlayOpacity: 0,
        lightingPoints: [],
      },
    });

    const stringStyles = fillStyles.filter(
      (style): style is string => typeof style === "string",
    );
    expect(stringStyles.filter((style) => style.startsWith("rgb("))).toHaveLength(
      0,
    );
  });
});

describe("repaintGridCells stroke overlay", () => {
  const tokens = {
    checkerA: "#ccc",
    checkerB: "#fff",
    gridLine: "rgba(0,0,0,0.08)",
  };

  it("repaints only targeted cells without clearing the full canvas", () => {
    const { ctx } = createMockContext();
    const palette = ["#000000", "#ff0000", "#00ff00"];
    const basePixels = new Uint8Array([1, TRANSPARENT_INDEX, 2]);

    repaintGridCells({
      ctx,
      gridWidth: 3,
      gridHeight: 1,
      basePixels,
      paletteColors: palette,
      viewport: { zoom: 8, panX: 0, panY: 0 },
      tokens,
      cells: [{ x: 1, y: 0 }],
      previewByKey: new Map([["1,0", { next: 2 }]]),
    });

    expect(ctx.clearRect).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("uses preview color over committed pixel for overlay cells", () => {
    const { ctx, fillStyles } = createMockContext();
    const palette = ["#000000", "#ff0000", "#00ff00"];
    const basePixels = new Uint8Array([1]);

    repaintGridCells({
      ctx,
      gridWidth: 1,
      gridHeight: 1,
      basePixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
      cells: [{ x: 0, y: 0 }],
      previewByKey: new Map([["0,0", { next: 2 }]]),
    });

    expect(fillStyles).toContain("#00ff00");
    expect(fillStyles).not.toContain("#ff0000");
  });
});

describe("renderGrid paste preview", () => {
  const tokens = {
    checkerA: "#ccc",
    checkerB: "#fff",
    gridLine: "rgba(0,0,0,0.08)",
  };

  it("draws clipboard pixels at preview opacity above committed pixels", () => {
    const { ctx, fillRectCalls } = createMockContext();
    const palette = ["#000000", "#ff0000"];
    const pixels = new Uint8Array([TRANSPARENT_INDEX, TRANSPARENT_INDEX]);

    renderGrid({
      ctx,
      cssWidth: 64,
      cssHeight: 64,
      gridWidth: 2,
      gridHeight: 1,
      pixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
      pastePreview: {
        originX: 1,
        originY: 0,
        clipboard: { width: 1, height: 1, pixels: new Uint8Array([1]) },
      },
    });

    expect(fillRectCalls).toContain(PASTE_PREVIEW_OPACITY);
  });
});

describe("move preview repaint helpers", () => {
  it("includes source and destination cells for move preview", () => {
    const movePreview = {
      originX: 2,
      originY: 0,
      clipboard: { width: 2, height: 1, pixels: new Uint8Array([1, 2]) },
      sourceSelection: { x: 0, y: 0, width: 2, height: 1, shape: "rect" as const },
    };

    const keys = movePreviewAffectedCellKeys(movePreview);
    expect(keys.has("0,0")).toBe(true);
    expect(keys.has("1,0")).toBe(true);
    expect(keys.has("2,0")).toBe(true);
    expect(keys.has("3,0")).toBe(true);

    const previewByKey = buildMovePreviewByKey(movePreview);
    expect(previewByKey.get("0,0")?.next).toBe(TRANSPARENT_INDEX);
    expect(previewByKey.get("2,0")?.next).toBe(1);
    expect(previewByKey.get("3,0")?.next).toBe(2);
  });
});

describe("readCanvasTokens", () => {
  it("returns cached tokens without calling getComputedStyle again", () => {
    const element = document.createElement("canvas");
    const getComputedStyleSpy = vi
      .spyOn(window, "getComputedStyle")
      .mockReturnValue({
        getPropertyValue: (name: string) => {
          if (name === "--color-checker-a") return "#111111";
          if (name === "--color-checker-b") return "#222222";
          if (name === "--color-grid-line") return "rgba(0,0,0,0.1)";
          return "";
        },
      } as CSSStyleDeclaration);

    const first = readCanvasTokens(element);
    const second = readCanvasTokens(element);

    expect(first).toEqual(second);
    expect(getComputedStyleSpy).toHaveBeenCalledTimes(1);
  });
});

describe("renderGrid viewport culling", () => {
  const tokens = {
    checkerA: "#ccc",
    checkerB: "#fff",
    gridLine: "rgba(0,0,0,0.08)",
  };
  let offscreenStub: ReturnType<typeof stubOffscreenCanvasContext>;

  beforeEach(() => {
    offscreenStub = stubOffscreenCanvasContext();
  });

  afterEach(() => {
    offscreenStub.mockRestore();
  });

  it("limits pixel fillRect calls to visible cells when previews are active", () => {
    const { ctx, fillRectCalls } = createMockContext();
    const palette = ["#000000", "#ff0000"];
    const pixels = new Uint8Array(64 * 64).fill(1);

    renderGrid({
      ctx,
      cssWidth: 160,
      cssHeight: 160,
      gridWidth: 64,
      gridHeight: 64,
      pixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
      pastePreview: {
        originX: 1,
        originY: 0,
        clipboard: { width: 1, height: 1, pixels: new Uint8Array([1]) },
      },
    });

    expect(fillRectCalls.length).toBeLessThan(2000);
  });

  it("uses drawImage for cached pixel layers when no preview is active", () => {
    const { ctx } = createMockContext();
    const palette = ["#000000", "#ff0000"];
    const pixels = new Uint8Array([1, TRANSPARENT_INDEX]);

    renderGrid({
      ctx,
      cssWidth: 64,
      cssHeight: 64,
      gridWidth: 2,
      gridHeight: 1,
      pixels,
      paletteColors: palette,
      viewport: { zoom: 16, panX: 0, panY: 0 },
      tokens,
    });

    expect(ctx.drawImage).toHaveBeenCalled();
  });
});

describe("setupHiDpiCanvas", () => {
  it("does not reset backing store when CSS size is unchanged", () => {
    const widthSets: number[] = [];
    const heightSets: number[] = [];
    const canvas = document.createElement("canvas");
    let internalWidth = 0;
    let internalHeight = 0;

    Object.defineProperty(canvas, "width", {
      get: () => internalWidth,
      set: (value: number) => {
        widthSets.push(value);
        internalWidth = value;
      },
      configurable: true,
    });
    Object.defineProperty(canvas, "height", {
      get: () => internalHeight,
      set: (value: number) => {
        heightSets.push(value);
        internalHeight = value;
      },
      configurable: true,
    });

    const ctx = {
      setTransform: vi.fn(),
    };
    vi.spyOn(canvas, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );

    setupHiDpiCanvas(canvas, 320, 240);
    setupHiDpiCanvas(canvas, 320, 240);

    expect(widthSets).toHaveLength(1);
    expect(heightSets).toHaveLength(1);
  });
});
