import type { Palette, PixelateImportResponse } from "@pixelanea/api-client";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { vi } from "vitest";
import { PixelateWizard } from "@/components/import/PixelateWizard";
import type { ImportWizardStep } from "@/components/import/types";
import { getResolutionOption } from "@/components/import/resolutionPresets";
import type { ResolutionPreset } from "@/components/import/resolutionPresets";
import type { PalettePresetId } from "@/components/palette/palettePresets";
import { palettePresetLabel } from "@/components/palette/palettePresets";
import type { ImportColorCount, ImportPaletteMode } from "@/components/import/paletteImportOptions";
import { copy } from "@/content/copy";
import { resetSession } from "@/qa/editorFixtures";

export const IMPORT_PREVIEW_LABEL = "Import preview";

const nativeFileReader = globalThis.FileReader;

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Distinct payload per file so tests can prove which file reached the API. */
export function base64ForFile(file: File): string {
  return btoa(file.name);
}

export function imageFile(name: string, type = "image/png"): File {
  return new File([name], name, { type });
}

export function apiPalette(colors: readonly string[]): Palette {
  return {
    id: "palette-1",
    name: "Import palette",
    colors: colors.map((hex, index) => ({ slot: index + 1, hex })),
  };
}

export function pixelateResponse(options: {
  width: number;
  height: number;
  /** Palette index written to every cell unless `pixels` is given. */
  fill?: number;
  pixels?: readonly number[];
  palette?: readonly string[];
  frameIndex?: number;
}): PixelateImportResponse {
  const { width, height, fill = 1, pixels, palette, frameIndex = 0 } = options;
  return {
    frameIndex,
    width,
    height,
    pixels: pixels ? [...pixels] : Array.from({ length: width * height }, () => fill),
    ...(palette ? { palette: apiPalette(palette) } : {}),
  };
}

/** Grid with a transparent (index 0) border and `fill` interior. */
export function pixelsWithTransparentBorder(
  width: number,
  height: number,
  fill = 1,
): number[] {
  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const onBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      pixels.push(onBorder ? 0 : fill);
    }
  }
  return pixels;
}

export function resetImportSession(
  overrides: Parameters<typeof resetSession>[0] = {},
): void {
  resetSession(overrides);
}

/** Re-arms the shared setup stub after `vi.resetAllMocks()` clears it. */
export function stubMatchMedia(prefersDark = false): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

export type PreviewCapture = {
  /** Last ImageData handed to putImageData, with the pixel bytes the code wrote. */
  last: { width: number; height: number; data: Uint8ClampedArray } | null;
  calls: number;
};

/**
 * Canvas stub that keeps `createImageData`/`putImageData` real enough to assert
 * rendered preview colors, and answers any other 2D call with a spy.
 */
export function stubPreviewCanvas(): PreviewCapture {
  class ResizeObserverMock {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);

  const capture: PreviewCapture = { last: null, calls: 0 };

  const base: Record<string, unknown> = {
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb" as const,
    }),
    putImageData: (image: { width: number; height: number; data: Uint8ClampedArray }) => {
      capture.last = image;
      capture.calls += 1;
    },
  };

  const context = new Proxy(base, {
    get(target, property: string) {
      if (!(property in target)) {
        target[property] = vi.fn();
      }
      return target[property];
    },
    set(target, property: string, value) {
      target[property] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);

  return capture;
}

export function previewRgbAt(
  capture: PreviewCapture,
  x: number,
  y: number,
): [number, number, number] {
  const image = capture.last;
  if (!image) {
    throw new Error("No preview ImageData was drawn");
  }
  const offset = (y * image.width + x) * 4;
  return [image.data[offset]!, image.data[offset + 1]!, image.data[offset + 2]!];
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

export type QueuedRead = {
  file: File;
  resolve: () => void;
  fail: () => void;
};

/**
 * FileReader stub that never completes on its own, so tests can complete
 * overlapping reads in any order.
 */
export function installQueuedFileReader(): QueuedRead[] {
  const queue: QueuedRead[] = [];

  class QueuedFileReader {
    result: string | null = null;
    error: unknown = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    readAsDataURL(file: File) {
      queue.push({
        file,
        resolve: () => {
          this.result = `data:${file.type};base64,${base64ForFile(file)}`;
          this.onload?.();
        },
        fail: () => {
          this.error = new Error("read failed");
          this.onerror?.();
        },
      });
    }
  }

  vi.stubGlobal("FileReader", QueuedFileReader);
  return queue;
}

export function restoreFileReader(): void {
  vi.stubGlobal("FileReader", nativeFileReader);
}

export function renderImportWizard(
  overrides: { onComplete?: () => void; onBack?: () => void } = {},
) {
  const onComplete = overrides.onComplete ?? vi.fn();
  const onBack = overrides.onBack ?? vi.fn();
  const view = render(createElement(PixelateWizard, { onComplete, onBack }));
  return { ...view, onComplete, onBack };
}

function dropZone(): HTMLElement {
  const zone = screen.getByText(copy.importWizardDropHint).closest("button");
  if (!zone) {
    throw new Error("Drop zone not found");
  }
  return zone;
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error("File input not found");
  }
  return input;
}

/** Drag-and-drop entry (Casey's primary path). */
export async function dropFile(file: File): Promise<void> {
  await act(async () => {
    fireEvent.drop(dropZone(), { dataTransfer: { files: [file] } });
  });
}

/** File picker entry; pass no file to simulate a cancelled picker. */
export async function pickFile(file?: File): Promise<void> {
  await act(async () => {
    fireEvent.change(fileInput(), { target: { files: file ? [file] : [] } });
  });
}

export async function expectFileAccepted(file: File): Promise<void> {
  await waitFor(() => {
    if (!screen.queryByText(file.name)) {
      throw new Error(`File ${file.name} was not accepted`);
    }
  });
}

export async function dropAcceptedFile(file: File): Promise<void> {
  await dropFile(file);
  await expectFileAccepted(file);
}

async function clickButton(name: string | RegExp): Promise<void> {
  const button = screen.getByRole("button", { name });
  await act(async () => {
    fireEvent.click(button);
  });
}

export async function clickNext(): Promise<void> {
  await clickButton(copy.importWizardNext);
}

export async function clickAccept(): Promise<void> {
  await clickButton(copy.importWizardAccept);
}

export async function clickBack(): Promise<void> {
  await clickButton(copy.importWizardBack);
}

export function nextButton(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: copy.importWizardNext,
  }) as HTMLButtonElement;
}

export function acceptButton(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: copy.importWizardAccept,
  }) as HTMLButtonElement;
}

export async function selectResolution(size: ResolutionPreset): Promise<void> {
  const option = getResolutionOption(size);
  if (!option) {
    throw new Error(`Unknown resolution preset ${size}`);
  }
  await clickButton(new RegExp(`${option.label}\\s+${option.description}`));
}

export async function selectPalettePreset(id: PalettePresetId): Promise<void> {
  await selectPaletteMode("style");
  await clickButton(palettePresetLabel(id));
}

export async function selectPaletteMode(mode: ImportPaletteMode): Promise<void> {
  const label =
    mode === "image"
      ? copy.importWizardPaletteModeImage
      : copy.importWizardPaletteModeStyle;
  await clickButton(new RegExp(`${label}\\s+`));
}

export async function selectColorCount(count: ImportColorCount): Promise<void> {
  const meta = copy.importWizardColorCountOption(count);
  await clickButton(new RegExp(`${meta.label}\\s+${meta.description}`));
}

export async function toggleRemoveBackground(): Promise<void> {
  const button = screen.getByRole("button", {
    name: new RegExp(`${copy.importWizardRemoveBackground}`, "i"),
  });
  await act(async () => {
    fireEvent.click(button);
  });
}

export function removeBackgroundToggle(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: new RegExp(`${copy.importWizardRemoveBackground}`, "i"),
  }) as HTMLButtonElement;
}

/** Jump back to an earlier wizard step through the step indicator. */
export async function clickStepTab(step: ImportWizardStep): Promise<void> {
  const tab = document.getElementById(`import-wizard-tab-${step}`);
  if (!tab) {
    throw new Error(`Step tab ${step} not found`);
  }
  await act(async () => {
    fireEvent.click(tab);
  });
}

export function previewCanvas(): HTMLCanvasElement {
  return screen.getByLabelText(IMPORT_PREVIEW_LABEL) as HTMLCanvasElement;
}

export async function waitForPreview(width?: number): Promise<HTMLCanvasElement> {
  await waitFor(() => {
    const canvas = previewCanvas();
    if (width !== undefined && canvas.width !== width) {
      throw new Error(`Preview width ${canvas.width} !== ${width}`);
    }
  });
  return previewCanvas();
}

export function isPixelatingVisible(): boolean {
  return screen.queryByText(copy.importWizardLoading) !== null;
}

/** file → resolution → palette, leaving the palette step on screen. */
export async function advanceToPaletteStep(
  file: File,
  resolution?: ResolutionPreset,
): Promise<void> {
  await dropAcceptedFile(file);
  await clickNext();
  if (resolution) {
    await selectResolution(resolution);
  }
  await clickNext();
}
