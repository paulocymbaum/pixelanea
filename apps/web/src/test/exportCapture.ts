import { vi } from "vitest";

export type CapturedDownload = {
  filename: string;
  width: number;
  height: number;
  data: Uint8ClampedArray | null;
  blobType: string;
};

export type ExportCapture = {
  downloads: CapturedDownload[];
  restore: () => void;
};

/** Stub canvas export, object URLs, and anchor clicks to capture download output. */
export function installExportCapture(): ExportCapture {
  const downloads: CapturedDownload[] = [];
  const pending: Array<{ width: number; height: number; data: Uint8ClampedArray }> =
    [];

  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement) {
      const { width: canvasWidth, height: canvasHeight } = this;
      return {
        createImageData: (width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
          colorSpace: "srgb" as const,
        }),
        putImageData: (imageData: ImageData) => {
          pending.push({
            width: canvasWidth,
            height: canvasHeight,
            data: new Uint8ClampedArray(imageData.data),
          });
        },
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    });

  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((callback, type) => {
      callback(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
        type: typeof type === "string" ? type : "image/png",
      }));
    });

  const createObjectURL = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementation((source: Blob | MediaSource) => {
      const blob = source as Blob;
      const frame = pending.shift();
      downloads.push({
        filename: "",
        width: frame?.width ?? 0,
        height: frame?.height ?? 0,
        data: frame?.data ?? null,
        blobType: blob.type,
      });
      return `blob:capture-${downloads.length}`;
    });

  const revokeObjectURL = vi
    .spyOn(URL, "revokeObjectURL")
    .mockImplementation(() => {});

  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      const last = downloads[downloads.length - 1];
      if (last && !last.filename) {
        last.filename = this.download;
      }
    });

  return {
    downloads,
    restore: () => {
      getContext.mockRestore();
      toBlob.mockRestore();
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      click.mockRestore();
    },
  };
}

export function rgbaAt(
  download: CapturedDownload,
  x: number,
  y: number,
): [number, number, number, number] {
  const data = download.data;
  if (!data) {
    throw new Error("captured download has no pixel data");
  }
  const offset = (y * download.width + x) * 4;
  return [
    data[offset] ?? 0,
    data[offset + 1] ?? 0,
    data[offset + 2] ?? 0,
    data[offset + 3] ?? 0,
  ];
}
