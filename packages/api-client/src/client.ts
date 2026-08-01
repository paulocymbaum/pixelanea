import type { components, paths } from "./generated/schema";

export type HealthResponse = components["schemas"]["HealthResponse"];
export type AssetType = components["schemas"]["AssetType"];
export type Project = components["schemas"]["Project"];
export type Frame = components["schemas"]["Frame"];
export type FrameMetadata = components["schemas"]["FrameMetadata"];
export type CreateProjectRequest = components["schemas"]["CreateProjectRequest"];
export type UpdateProjectRequest = components["schemas"]["UpdateProjectRequest"];
export type PutFrameRequest = components["schemas"]["PutFrameRequest"];
export type DuplicateFramesRequest = components["schemas"]["DuplicateFramesRequest"];
export type DuplicateFramesResponse = components["schemas"]["DuplicateFramesResponse"];
export type CopyFrameRequest = components["schemas"]["CopyFrameRequest"];
export type CopyFrameResponse = components["schemas"]["CopyFrameResponse"];
export type ReorderFramesRequest = components["schemas"]["ReorderFramesRequest"];
export type ReorderFramesResponse = components["schemas"]["ReorderFramesResponse"];
export type Palette = components["schemas"]["Palette"];
export type PutPaletteRequest = components["schemas"]["PutPaletteRequest"];
export type PixelateImportRequest = components["schemas"]["PixelateImportRequest"];
export type PixelateImportResponse = components["schemas"]["PixelateImportResponse"];
export type ExportGifRequest = components["schemas"]["ExportGifRequest"];
export type OpenProjectRequest = components["schemas"]["OpenProjectRequest"];
export type SaveProjectRequest = components["schemas"]["SaveProjectRequest"];
export type SaveProjectResponse = components["schemas"]["SaveProjectResponse"];
export type PickProjectPathRequest = components["schemas"]["PickProjectPathRequest"];
export type PickProjectPathResponse = components["schemas"]["PickProjectPathResponse"];
export type Color = components["schemas"]["Color"];
export type ErrorResponse = components["schemas"]["ErrorResponse"];

export type ApiClientConfig = {
  baseUrl?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly body?: ErrorResponse;

  constructor(status: number, message: string, body?: ErrorResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  config: ApiClientConfig = {},
): Promise<T> {
  const base = config.baseUrl ?? "";
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let body: ErrorResponse | undefined;
    try {
      body = (await response.json()) as ErrorResponse;
    } catch {
      // non-JSON error body
    }
    const message = body?.message ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestBinary(
  path: string,
  options: RequestInit = {},
  config: ApiClientConfig = {},
): Promise<Blob> {
  const base = config.baseUrl ?? "";
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: "image/gif",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let body: ErrorResponse | undefined;
    try {
      body = (await response.json()) as ErrorResponse;
    } catch {
      // non-JSON error body
    }
    const message = body?.message ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message, body);
  }

  return response.blob();
}

export function createApiClient(config: ApiClientConfig = {}) {
  return {
    getHealth: () =>
      request<paths["/api/health"]["get"]["responses"]["200"]["content"]["application/json"]>(
        "/api/health",
        {},
        config,
      ),

    pickProjectPath: (body: PickProjectPathRequest) =>
      request<PickProjectPathResponse>(
        "/api/dialog/pick-project-path",
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    createProject: (body: CreateProjectRequest) =>
      request<Project>(
        "/api/projects",
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    openProject: (body: OpenProjectRequest) =>
      request<Project>(
        "/api/projects/open",
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    getProject: (projectId: string) =>
      request<Project>(`/api/projects/${projectId}`, {}, config),

    updateProject: (projectId: string, body: UpdateProjectRequest) =>
      request<Project>(
        `/api/projects/${projectId}`,
        { method: "PATCH", body: JSON.stringify(body) },
        config,
      ),

    closeProject: (projectId: string) =>
      request<void>(`/api/projects/${projectId}`, { method: "DELETE" }, config),

    saveProject: (projectId: string, body: SaveProjectRequest) =>
      request<SaveProjectResponse>(
        `/api/projects/${projectId}/save`,
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    listFrames: (projectId: string) =>
      request<{ frames: FrameMetadata[] }>(
        `/api/projects/${projectId}/frames`,
        {},
        config,
      ),

    getFrame: (projectId: string, frameIndex: number) =>
      request<Frame>(
        `/api/projects/${projectId}/frames/${frameIndex}`,
        {},
        config,
      ),

    putFrame: (projectId: string, frameIndex: number, body: PutFrameRequest) =>
      request<FrameMetadata>(
        `/api/projects/${projectId}/frames/${frameIndex}`,
        { method: "PUT", body: JSON.stringify(body) },
        config,
      ),

    duplicateFrames: (projectId: string, body: DuplicateFramesRequest) =>
      request<DuplicateFramesResponse>(
        `/api/projects/${projectId}/frames/duplicate`,
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    copyFrame: (projectId: string, body: CopyFrameRequest) =>
      request<CopyFrameResponse>(
        `/api/projects/${projectId}/frames/copy`,
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    reorderFrames: (projectId: string, body: ReorderFramesRequest) =>
      request<ReorderFramesResponse>(
        `/api/projects/${projectId}/frames/reorder`,
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    getPalette: (projectId: string) =>
      request<Palette>(`/api/projects/${projectId}/palette`, {}, config),

    putPalette: (projectId: string, body: PutPaletteRequest) =>
      request<Palette>(
        `/api/projects/${projectId}/palette`,
        { method: "PUT", body: JSON.stringify(body) },
        config,
      ),

    importPixelate: (projectId: string, body: PixelateImportRequest) =>
      request<PixelateImportResponse>(
        `/api/projects/${projectId}/import/pixelate`,
        { method: "POST", body: JSON.stringify(body) },
        config,
      ),

    exportGif: (projectId: string, body?: ExportGifRequest) =>
      requestBinary(
        `/api/projects/${projectId}/export/gif`,
        {
          method: "POST",
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
        config,
      ),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
