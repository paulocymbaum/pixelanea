import { vi } from "vitest";
import { ApiError } from "@pixelanea/api-client";
import type {
  ApiClient,
  AssetType,
  Frame,
  OpenProjectRequest,
  Palette,
  Project,
  PutFrameRequest,
  PutPaletteRequest,
  SaveProjectRequest,
  SaveProjectResponse,
  UpdateProjectRequest,
} from "@pixelanea/api-client";
import { DEFAULT_PALETTE_COLORS } from "@/canvas/palette";
import { useEditorStore } from "@/state/editorStore";

/** `ExportGifRequest` is not re-exported from the package index, so derive it. */
type ExportGifBody = NonNullable<Parameters<ApiClient["exportGif"]>[1]>;

export const MATRIX_PROJECT_ID = "project-io-project";
export const MATRIX_GRID = 8;
export const MATRIX_BUNDLE_PATH = "/tmp/pixelanea-qa/current.pixelanea";

/** Server-side error copy the C++ layer returns for unreadable bundles. */
export const SERVER_CORRUPT_BUNDLE_MESSAGE =
  "Couldn't open this file. Is it a .pixelanea project?";
export const SERVER_CHECKSUM_MESSAGE = "bundle checksum mismatch: project.db";
export const SERVER_TRAVERSAL_MESSAGE = "unsafe bundle entry path";
export const SERVER_READ_ONLY_MESSAGE = "could not write bundle to destination";
export const SERVER_DISK_FULL_MESSAGE =
  "could not write bundle to destination: no space left on device";
/** `ProjectRepository::open_from_bundle` refuses a project id it already holds. */
export const SERVER_ALREADY_OPEN_MESSAGE = "project is already open";

type ProjectRecord = {
  project: Project;
  palette: Palette;
  frames: Map<number, number[]>;
};

/** What a `.pixelanea` file holds once packed: project row, palette, every frame. */
export type StoredBundle = {
  record: ProjectRecord;
  assetType: AssetType;
  savedAt: string;
};

/** Reason `openProject` should reject a given path. */
export type BundleFault = "corrupt" | "checksum" | "traversal";

export type SeedProjectParams = {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  frameCount?: number;
  fps?: number;
  loop?: boolean;
  assetType?: AssetType;
  paletteColors?: readonly string[];
  frames?: Record<number, Uint8Array>;
};

function cloneProject(project: Project): Project {
  return { ...project };
}

function cloneRecord(record: ProjectRecord): ProjectRecord {
  return {
    project: cloneProject(record.project),
    palette: {
      ...record.palette,
      colors: record.palette.colors.map((color) => ({ ...color })),
    },
    frames: new Map(
      [...record.frames.entries()].map(([index, pixels]) => [index, [...pixels]]),
    ),
  };
}

function paletteFromColors(colors: readonly string[]): Palette {
  return {
    id: "palette-1",
    name: "Matrix palette",
    colors: colors.map((hex, slot) => ({ slot, hex })),
  };
}

/**
 * In-memory stand-in for the local API server plus the filesystem it writes
 * `.pixelanea` bundles to. Lets the matrix exercise the real `api/`, state, and
 * component layers while staying deterministic in jsdom.
 */
export class FakeProjectBackend {
  /** Fake filesystem: absolute path → packed bundle. */
  readonly files = new Map<string, StoredBundle>();
  /** Ordered log of API calls, used by race cases to assert sequencing. */
  readonly calls: string[] = [];
  readonly writeCounts = new Map<string, number>();
  readonly gifRequests: Array<{ projectId: string; body?: ExportGifBody }> = [];

  bundleFaults = new Map<string, BundleFault>();
  readOnlyPrefixes: string[] = [];
  diskFull = false;
  gifError: ApiError | null = null;
  /** Awaited inside `saveProject` before the write lands; used to gate races. */
  beforeSave: ((path: string) => Promise<void> | void) | null = null;
  /** Awaited inside `putFrame`; used to keep autosave in flight during a save. */
  beforeFrameWrite: ((frameIndex: number) => Promise<void> | void) | null = null;

  private readonly projects = new Map<string, ProjectRecord>();

  seedProject(params: SeedProjectParams = {}): Project {
    const id = params.id ?? MATRIX_PROJECT_ID;
    const width = params.width ?? MATRIX_GRID;
    const height = params.height ?? MATRIX_GRID;
    const frameCount = params.frameCount ?? 1;
    const paletteColors = params.paletteColors ?? DEFAULT_PALETTE_COLORS;

    const frames = new Map<number, number[]>();
    for (let index = 0; index < frameCount; index++) {
      const seeded = params.frames?.[index];
      frames.set(
        index,
        seeded ? [...seeded] : new Array<number>(width * height).fill(0),
      );
    }

    const project: Project = {
      id,
      name: params.name ?? "Matrix project",
      width,
      height,
      frameCount,
      fps: params.fps ?? 8,
      loop: params.loop ?? true,
      cellSize: 16,
      assetType: params.assetType ?? "character",
      createdAt: "2026-07-31T00:00:00Z",
      updatedAt: "2026-07-31T00:00:00Z",
    };

    this.projects.set(id, {
      project,
      palette: paletteFromColors(paletteColors),
      frames,
    });

    return cloneProject(project);
  }

  /**
   * Write a bundle straight to the fake filesystem, leaving the project closed
   * the way a file created by an earlier session would be.
   */
  seedBundleFile(path: string, params: SeedProjectParams = {}): Project {
    const project = this.seedProject(params);
    const record = this.requireRecord(project.id);
    this.files.set(path, {
      record: cloneRecord(record),
      assetType: record.project.assetType,
      savedAt: "2026-07-31T00:00:00Z",
    });
    this.projects.delete(project.id);
    return project;
  }

  /** Drop every open project handle, as restarting the local server would. */
  simulateSessionRestart(): void {
    this.projects.clear();
  }

  isOpen(projectId: string): boolean {
    return this.projects.has(projectId);
  }

  bundleFrame(path: string, frameIndex: number): number[] {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`no bundle at ${path}`);
    }
    return [...(file.record.frames.get(frameIndex) ?? [])];
  }

  liveFrame(projectId: string, frameIndex: number): number[] {
    return [...(this.requireRecord(projectId).frames.get(frameIndex) ?? [])];
  }

  private requireRecord(projectId: string): ProjectRecord {
    const record = this.projects.get(projectId);
    if (!record) {
      throw new ApiError(404, "project not found", { message: "project not found" });
    }
    return record;
  }

  private assertWritable(path: string): void {
    if (this.diskFull) {
      throw new ApiError(500, SERVER_DISK_FULL_MESSAGE, {
        message: SERVER_DISK_FULL_MESSAGE,
      });
    }
    if (this.readOnlyPrefixes.some((prefix) => path.startsWith(prefix))) {
      throw new ApiError(400, SERVER_READ_ONLY_MESSAGE, {
        message: SERVER_READ_ONLY_MESSAGE,
      });
    }
  }

  asApiClient(): ApiClient {
    const client = {
      getProject: async (projectId: string): Promise<Project> => {
        this.calls.push(`getProject:${projectId}`);
        return cloneProject(this.requireRecord(projectId).project);
      },

      updateProject: async (
        projectId: string,
        body: UpdateProjectRequest,
      ): Promise<Project> => {
        this.calls.push(`updateProject:${projectId}`);
        const record = this.requireRecord(projectId);
        // Mirrors ProjectRepository::update: every provided field is written to
        // the project row, and the row is what a later save packs.
        record.project = {
          ...record.project,
          ...(body.name === undefined ? {} : { name: body.name }),
          ...(body.fps === undefined ? {} : { fps: body.fps }),
          ...(body.loop === undefined ? {} : { loop: body.loop }),
          ...(body.cellSize === undefined ? {} : { cellSize: body.cellSize }),
          ...(body.assetType === undefined ? {} : { assetType: body.assetType }),
          updatedAt: "2026-07-31T00:00:00Z",
        };
        return cloneProject(record.project);
      },

      getPalette: async (projectId: string): Promise<Palette> => {
        this.calls.push(`getPalette:${projectId}`);
        return cloneRecord(this.requireRecord(projectId)).palette;
      },

      putPalette: async (
        projectId: string,
        body: PutPaletteRequest,
      ): Promise<Palette> => {
        this.calls.push(`putPalette:${projectId}`);
        const record = this.requireRecord(projectId);
        record.palette = {
          ...record.palette,
          colors: body.colors.map((color) => ({ ...color })),
        };
        return cloneRecord(record).palette;
      },

      getFrame: async (projectId: string, frameIndex: number): Promise<Frame> => {
        this.calls.push(`getFrame:${projectId}:${frameIndex}`);
        const record = this.requireRecord(projectId);
        const pixels = record.frames.get(frameIndex);
        if (!pixels) {
          throw new ApiError(404, "frame not found", { message: "frame not found" });
        }
        return {
          index: frameIndex,
          width: record.project.width,
          height: record.project.height,
          updatedAt: "2026-07-31T00:00:00Z",
          pixels: [...pixels],
        };
      },

      putFrame: async (
        projectId: string,
        frameIndex: number,
        body: PutFrameRequest,
      ): Promise<Frame> => {
        this.calls.push(`putFrame:${projectId}:${frameIndex}`);
        await this.beforeFrameWrite?.(frameIndex);
        const record = this.requireRecord(projectId);
        record.frames.set(frameIndex, [...body.pixels]);
        return {
          index: frameIndex,
          width: record.project.width,
          height: record.project.height,
          updatedAt: "2026-07-31T00:00:00Z",
          pixels: [...body.pixels],
        };
      },

      openProject: async (body: OpenProjectRequest): Promise<Project> => {
        this.calls.push(`openProject:${body.path}`);

        const fault = this.bundleFaults.get(body.path);
        if (fault === "checksum") {
          throw new ApiError(400, SERVER_CHECKSUM_MESSAGE, {
            message: SERVER_CHECKSUM_MESSAGE,
          });
        }
        if (fault === "traversal") {
          throw new ApiError(400, SERVER_TRAVERSAL_MESSAGE, {
            message: SERVER_TRAVERSAL_MESSAGE,
          });
        }
        if (fault === "corrupt" || !this.files.has(body.path)) {
          throw new ApiError(400, SERVER_CORRUPT_BUNDLE_MESSAGE, {
            message: SERVER_CORRUPT_BUNDLE_MESSAGE,
          });
        }

        const file = this.files.get(body.path)!;
        const record = cloneRecord(file.record);
        if (this.projects.has(record.project.id)) {
          throw new ApiError(400, SERVER_ALREADY_OPEN_MESSAGE, {
            message: SERVER_ALREADY_OPEN_MESSAGE,
          });
        }

        // The server unpacks the bundle into a fresh DB, so the loaded state is
        // whatever the file holds — not the in-memory edits it was packed from.
        this.projects.set(record.project.id, record);
        return cloneProject(record.project);
      },

      saveProject: async (
        projectId: string,
        body: SaveProjectRequest,
      ): Promise<SaveProjectResponse> => {
        this.calls.push(`saveProject:${projectId}:${body.path}`);
        await this.beforeSave?.(body.path);

        const record = this.requireRecord(projectId);
        this.assertWritable(body.path);

        if (body.assetType) {
          record.project = { ...record.project, assetType: body.assetType };
        }

        const savedAt = new Date(2026, 6, 31, 12, 0, 0).toISOString();
        this.files.set(body.path, {
          record: cloneRecord(record),
          assetType: record.project.assetType,
          savedAt,
        });
        this.writeCounts.set(
          body.path,
          (this.writeCounts.get(body.path) ?? 0) + 1,
        );

        return { path: body.path, savedAt };
      },

      exportGif: async (
        projectId: string,
        body?: ExportGifBody,
      ): Promise<Blob> => {
        this.calls.push(`exportGif:${projectId}`);
        this.gifRequests.push({ projectId, ...(body ? { body } : {}) });
        if (this.gifError) {
          throw this.gifError;
        }
        this.requireRecord(projectId);
        return new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], {
          type: "image/gif",
        });
      },
    };

    return client as unknown as ApiClient;
  }
}

/** Reset the editor store to a clean saved-project baseline for a matrix case. */
export function resetProjectIoStore(
  overrides: Partial<ReturnType<typeof useEditorStore.getState>> = {},
): void {
  const width = overrides.gridWidth ?? MATRIX_GRID;
  const height = overrides.gridHeight ?? MATRIX_GRID;
  const pixels = overrides.pixels ?? new Uint8Array(width * height);

  useEditorStore.setState({
    projectId: MATRIX_PROJECT_ID,
    projectName: "Matrix project",
    activeTool: "paint",
    activeColorIndex: 1,
    activeFrameIndex: 0,
    frameCount: 1,
    gridWidth: width,
    gridHeight: height,
    pixels: new Uint8Array(pixels),
    paletteColors: DEFAULT_PALETTE_COLORS,
    paletteLocked: false,
    readOnly: false,
    isPlaying: false,
    placingLighting: false,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    isPaletteDirty: false,
    framePixelsByIndex: { 0: new Uint8Array(pixels) },
    frameSyncStatus: "idle",
    paletteSyncStatus: "idle",
    syncStatus: "idle",
    frameSyncError: null,
    paletteSyncError: null,
    syncError: null,
    bundlePath: null,
    assetType: "character",
    animationFps: 8,
    animationLoop: true,
    zoom: 1,
    panX: 0,
    panY: 0,
    ...overrides,
  });
}

/** Paint one cell and mark the frame dirty, mimicking a completed stroke. */
export function paintDirtyPixel(x: number, y: number, colorIndex = 1): void {
  const state = useEditorStore.getState();
  const pixels = new Uint8Array(state.pixels);
  pixels[y * state.gridWidth + x] = colorIndex;
  useEditorStore.setState({
    pixels,
    framePixelsByIndex: {
      ...state.framePixelsByIndex,
      [state.activeFrameIndex]: new Uint8Array(pixels),
    },
    isDirty: true,
  });
}

/** Edit the palette and mark it dirty, mimicking a swatch change. */
export function editDirtyPalette(slot: number, hex: string): void {
  const state = useEditorStore.getState();
  const paletteColors = [...state.paletteColors];
  paletteColors[slot] = hex;
  useEditorStore.setState({ paletteColors, isPaletteDirty: true });
}

export function pixelAt(x: number, y: number): number {
  const state = useEditorStore.getState();
  return state.pixels[y * state.gridWidth + x] ?? 0;
}

export function framePixels(width: number, height: number, fill: number): Uint8Array {
  return new Uint8Array(width * height).fill(fill);
}

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

/**
 * jsdom has no real canvas encoder, so stub the 2D context, `toBlob`, object
 * URLs, and anchor clicks to capture what an export *would* have written.
 */
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

/** Read one pixel's RGBA tuple out of a captured export buffer. */
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
