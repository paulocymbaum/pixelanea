import type { components } from "./generated/schema";
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
export declare class ApiError extends Error {
    readonly status: number;
    readonly body?: ErrorResponse;
    constructor(status: number, message: string, body?: ErrorResponse);
}
export declare function createApiClient(config?: ApiClientConfig): {
    getHealth: () => Promise<{
        status: "ok";
        version: string;
    }>;
    createProject: (body: CreateProjectRequest) => Promise<{
        id: string;
        name: string;
        width: number;
        height: number;
        frameCount: number;
        fps: number;
        cellSize: number;
        createdAt: string;
        updatedAt: string;
    }>;
    getProject: (projectId: string) => Promise<{
        id: string;
        name: string;
        width: number;
        height: number;
        frameCount: number;
        fps: number;
        cellSize: number;
        createdAt: string;
        updatedAt: string;
    }>;
    updateProject: (projectId: string, body: UpdateProjectRequest) => Promise<{
        id: string;
        name: string;
        width: number;
        height: number;
        frameCount: number;
        fps: number;
        cellSize: number;
        createdAt: string;
        updatedAt: string;
    }>;
    closeProject: (projectId: string) => Promise<void>;
    listFrames: (projectId: string) => Promise<{
        frames: FrameMetadata[];
    }>;
    getFrame: (projectId: string, frameIndex: number) => Promise<{
        index: number;
        width: number;
        height: number;
        updatedAt: string;
    } & {
        pixels: number[];
    }>;
    putFrame: (projectId: string, frameIndex: number, body: PutFrameRequest) => Promise<{
        index: number;
        width: number;
        height: number;
        updatedAt: string;
    }>;
    duplicateFrames: (projectId: string, body: DuplicateFramesRequest) => Promise<{
        project: components["schemas"]["Project"];
        frames: components["schemas"]["FrameMetadata"][];
    }>;
    getPalette: (projectId: string) => Promise<{
        id: string;
        name: string;
        colors: components["schemas"]["Color"][];
    }>;
    putPalette: (projectId: string, body: PutPaletteRequest) => Promise<{
        id: string;
        name: string;
        colors: components["schemas"]["Color"][];
    }>;
};
export type ApiClient = ReturnType<typeof createApiClient>;
//# sourceMappingURL=client.d.ts.map