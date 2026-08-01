import type { AssetType, CreateProjectRequest, Project } from "@pixelanea/api-client";
import { fetchFrame, pixelsFromFrame } from "./frames";
import { fetchPalette, paletteColorsFromApi } from "./palette";
import { getApiClient } from "./client";
import { logAndMapApiError } from "@/logging/apiError";

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
  fps: number;
  loop: boolean;
};

/** Animation settings stored on the project row, not on any single frame. */
export type ProjectSettings = {
  fps: number;
  loop: boolean;
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
  loop: true,
};

export async function createBlankProject(
  params: CreateProjectRequest = DEFAULT_CREATE_PROJECT,
): Promise<ProjectResult> {
  try {
    const project = await getApiClient().createProject(params);
    return { ok: true, project };
  } catch (error) {
    return { ok: false, message: logAndMapApiError("createBlankProject", error) };
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
        fps: project.fps,
        loop: project.loop,
      },
    };
  } catch (error) {
    return { ok: false, message: logAndMapApiError("loadProject", error, { projectId }) };
  }
}

export async function updateProjectSettings(
  projectId: string,
  settings: ProjectSettings,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await getApiClient().updateProject(projectId, {
      fps: settings.fps,
      loop: settings.loop,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("updateProjectSettings", error, { projectId }),
    };
  }
}

export async function openProjectFromBundle(
  path: string,
): Promise<ProjectResult> {
  try {
    const project = await getApiClient().openProject({ path });
    return { ok: true, project };
  } catch (error) {
    return { ok: false, message: logAndMapApiError("openProjectFromBundle", error, { path }) };
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
    return {
      ok: false,
      message: logAndMapApiError("saveProjectToBundle", error, { projectId, path }),
    };
  }
}
