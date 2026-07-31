import type { AssetType, CreateProjectRequest, Project } from "@pixelanea/api-client";
import { fetchFrame, pixelsFromFrame } from "./frames";
import { fetchPalette, paletteColorsFromApi } from "./palette";
import { getApiClient } from "./client";
import { mapApiError } from "./errors";

export type ProjectResult =
  | { ok: true; project: Project }
  | { ok: false; message: string };

export type LoadedProject = {
  projectId: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  frameCount: number;
  pixels: Uint8Array;
  paletteColors: readonly string[];
  bundlePath?: string | null;
  assetType: AssetType;
};

export type SaveProjectResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

const DEFAULT_CREATE_PROJECT: CreateProjectRequest = {
  name: "Untitled project",
  width: 32,
  height: 32,
  frameCount: 1,
  fps: 8,
  cellSize: 16,
};

export async function createBlankProject(
  params: CreateProjectRequest = DEFAULT_CREATE_PROJECT,
): Promise<ProjectResult> {
  try {
    const project = await getApiClient().createProject(params);
    return { ok: true, project };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}

export async function loadProject(
  projectId: string,
  frameIndex = 0,
): Promise<{ ok: true; data: LoadedProject } | { ok: false; message: string }> {
  try {
    const project = await getApiClient().getProject(projectId);
    const [paletteResult, frameResult] = await Promise.all([
      fetchPalette(projectId),
      fetchFrame(projectId, frameIndex),
    ]);

    if (!paletteResult.ok) {
      return { ok: false, message: paletteResult.message };
    }
    if (!frameResult.ok) {
      return { ok: false, message: frameResult.message };
    }

    return {
      ok: true,
      data: {
        projectId: project.id,
        name: project.name,
        gridWidth: project.width,
        gridHeight: project.height,
        frameCount: project.frameCount,
        pixels: pixelsFromFrame(frameResult.frame),
        paletteColors: paletteColorsFromApi(paletteResult.palette),
        assetType: project.assetType,
      },
    };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}

export async function openProjectFromBundle(
  path: string,
): Promise<ProjectResult> {
  try {
    const project = await getApiClient().openProject({ path });
    return { ok: true, project };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}

export async function saveProjectToBundle(
  projectId: string,
  path: string,
  assetType?: AssetType,
): Promise<SaveProjectResult> {
  try {
    const response = await getApiClient().saveProject(projectId, {
      path,
      ...(assetType ? { assetType } : {}),
    });
    return { ok: true, path: response.path };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}
