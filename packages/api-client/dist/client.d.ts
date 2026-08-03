import type { components } from "./generated/schema";
export type HealthResponse = components["schemas"]["HealthResponse"];
export type AssetType = components["schemas"]["AssetType"];
export type Project = components["schemas"]["Project"];
export type Frame = components["schemas"]["Frame"];
export type FrameMetadata = components["schemas"]["FrameMetadata"];
export type CreateProjectRequest = components["schemas"]["CreateProjectRequest"];
export type UpdateProjectRequest = components["schemas"]["UpdateProjectRequest"];
export type PutFrameRequest = components["schemas"]["PutFrameRequest"];
export type CellChange = components["schemas"]["CellChange"];
export type FrameBinary = {
    index: number;
    width: number;
    height: number;
    updatedAt: string;
    pixels: Uint8Array;
};
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
    pickProjectPath: (body: PickProjectPathRequest) => Promise<{
        path?: string;
        cancelled?: boolean;
    }>;
    createProject: (body: CreateProjectRequest) => Promise<{
        id: string;
        name: string;
        width: number;
        height: number;
        frameCount: number;
        fps: number;
        cellSize: number;
        assetType: components["schemas"]["AssetType"];
        loop: boolean;
        createdAt: string;
        updatedAt: string;
    }>;
    openProject: (body: OpenProjectRequest) => Promise<{
        id: string;
        name: string;
        width: number;
        height: number;
        frameCount: number;
        fps: number;
        cellSize: number;
        assetType: components["schemas"]["AssetType"];
        loop: boolean;
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
        assetType: components["schemas"]["AssetType"];
        loop: boolean;
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
        assetType: components["schemas"]["AssetType"];
        loop: boolean;
        createdAt: string;
        updatedAt: string;
    }>;
    closeProject: (projectId: string) => Promise<void>;
    saveProject: (projectId: string, body: SaveProjectRequest) => Promise<{
        path: string;
        savedAt: string;
    }>;
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
    putFrameBinary: (projectId: string, frameIndex: number, pixels: Uint8Array) => Promise<{
        index: number;
        width: number;
        height: number;
        updatedAt: string;
    }>;
    getFrameBinary: (projectId: string, frameIndex: number) => Promise<FrameBinary>;
    patchFrameCells: (projectId: string, frameIndex: number, changes: CellChange[]) => Promise<{
        index: number;
        width: number;
        height: number;
        updatedAt: string;
    }>;
    duplicateFrames: (projectId: string, body: DuplicateFramesRequest) => Promise<{
        project: components["schemas"]["Project"];
        frames: components["schemas"]["FrameMetadata"][];
    }>;
    copyFrame: (projectId: string, body: CopyFrameRequest) => Promise<{
        frame: components["schemas"]["FrameMetadata"];
    }>;
    reorderFrames: (projectId: string, body: ReorderFramesRequest) => Promise<{
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
    importPixelate: (projectId: string, body: PixelateImportRequest) => Promise<{
        frameIndex: number;
        width: number;
        height: number;
        pixels: number[];
        palette?: components["schemas"]["Palette"];
    }>;
    exportGif: (projectId: string, body?: ExportGifRequest) => Promise<Blob>;
};
export type ApiClient = ReturnType<typeof createApiClient>;
//# sourceMappingURL=client.d.ts.map