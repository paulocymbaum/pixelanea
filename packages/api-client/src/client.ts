import type { components, paths } from "./generated/schema";

export type HealthResponse = components["schemas"]["HealthResponse"];
export type Project = components["schemas"]["Project"];
export type Frame = components["schemas"]["Frame"];
export type FrameMetadata = components["schemas"]["FrameMetadata"];
export type CreateProjectRequest = components["schemas"]["CreateProjectRequest"];
export type UpdateProjectRequest = components["schemas"]["UpdateProjectRequest"];
export type PutFrameRequest = components["schemas"]["PutFrameRequest"];
export type DuplicateFramesRequest = components["schemas"]["DuplicateFramesRequest"];
export type DuplicateFramesResponse = components["schemas"]["DuplicateFramesResponse"];
export type Palette = components["schemas"]["Palette"];
export type PutPaletteRequest = components["schemas"]["PutPaletteRequest"];
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

export function createApiClient(config: ApiClientConfig = {}) {
  return {
    getHealth: () =>
      request<paths["/api/health"]["get"]["responses"]["200"]["content"]["application/json"]>(
        "/api/health",
        {},
        config,
      ),

    createProject: (body: CreateProjectRequest) =>
      request<Project>(
        "/api/projects",
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

    getPalette: (projectId: string) =>
      request<Palette>(`/api/projects/${projectId}/palette`, {}, config),

    putPalette: (projectId: string, body: PutPaletteRequest) =>
      request<Palette>(
        `/api/projects/${projectId}/palette`,
        { method: "PUT", body: JSON.stringify(body) },
        config,
      ),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
