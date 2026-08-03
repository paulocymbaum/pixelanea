import type {
  CopyFrameRequest,
  CopyFrameResponse,
  DuplicateFramesRequest,
  DuplicateFramesResponse,
  Frame,
  ReorderFramesRequest,
  ReorderFramesResponse,
} from "@pixelanea/api-client";
import { getApiClient } from "./client";
import { logAndMapApiError } from "@/logging/apiError";

export function pixelsFromFrame(frame: Frame): Uint8Array {
  const count = frame.width * frame.height;
  const pixels = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    pixels[i] = frame.pixels[i] ?? 0;
  }
  return pixels;
}

export type FetchedFramePixels = {
  index: number;
  width: number;
  height: number;
  updatedAt: string;
  pixels: Uint8Array;
};

export async function fetchFrame(
  projectId: string,
  frameIndex: number,
): Promise<{ ok: true } & FetchedFramePixels | { ok: false; message: string }> {
  try {
    const binary = await getApiClient().getFrameBinary(projectId, frameIndex);
    return {
      ok: true,
      index: binary.index,
      width: binary.width,
      height: binary.height,
      updatedAt: binary.updatedAt,
      pixels: binary.pixels,
    };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("fetchFrame", error, { projectId, frameIndex }),
    };
  }
}

export async function saveFrame(
  projectId: string,
  frameIndex: number,
  pixels: Uint8Array,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await getApiClient().putFrameBinary(projectId, frameIndex, pixels);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("saveFrame", error, { projectId, frameIndex }),
    };
  }
}

export async function saveFrameCells(
  projectId: string,
  frameIndex: number,
  changes: readonly {
    x: number;
    y: number;
    previous: number;
    next: number;
  }[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await getApiClient().patchFrameCells(projectId, frameIndex, [...changes]);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("saveFrameCells", error, {
        projectId,
        frameIndex,
        changeCount: changes.length,
      }),
    };
  }
}

export async function duplicateFrames(
  projectId: string,
  body: DuplicateFramesRequest,
): Promise<
  { ok: true; response: DuplicateFramesResponse } | { ok: false; message: string }
> {
  try {
    const response = await getApiClient().duplicateFrames(projectId, body);
    return { ok: true, response };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("duplicateFrames", error, { projectId }),
    };
  }
}

export async function copyFrame(
  projectId: string,
  body: CopyFrameRequest,
): Promise<{ ok: true; response: CopyFrameResponse } | { ok: false; message: string }> {
  try {
    const response = await getApiClient().copyFrame(projectId, body);
    return { ok: true, response };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("copyFrame", error, { projectId }),
    };
  }
}

export async function reorderFrames(
  projectId: string,
  body: ReorderFramesRequest,
): Promise<
  { ok: true; response: ReorderFramesResponse } | { ok: false; message: string }
> {
  try {
    const response = await getApiClient().reorderFrames(projectId, body);
    return { ok: true, response };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("reorderFrames", error, { projectId }),
    };
  }
}
