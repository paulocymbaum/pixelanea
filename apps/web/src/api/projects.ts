import type { CreateProjectRequest, Project } from "@pixelanea/api-client";
import { getApiClient } from "./client";
import { mapApiError } from "./errors";

export type BootstrapProjectResult =
  | { ok: true; project: Project }
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
): Promise<BootstrapProjectResult> {
  try {
    const project = await getApiClient().createProject(params);
    return { ok: true, project };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}
