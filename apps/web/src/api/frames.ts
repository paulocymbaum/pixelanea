import type { Frame } from "@pixelanea/api-client";
import { getApiClient } from "./client";
import { mapApiError } from "./errors";

export function pixelsFromFrame(frame: Frame): Uint8Array {
  const count = frame.width * frame.height;
  const pixels = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    pixels[i] = frame.pixels[i] ?? 0;
  }
  return pixels;
}

export function pixelsToApi(pixels: Uint8Array): number[] {
  return Array.from(pixels);
}

export async function fetchFrame(
  projectId: string,
  frameIndex: number,
): Promise<{ ok: true; frame: Frame } | { ok: false; message: string }> {
  try {
    const frame = await getApiClient().getFrame(projectId, frameIndex);
    return { ok: true, frame };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}

export async function saveFrame(
  projectId: string,
  frameIndex: number,
  pixels: Uint8Array,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await getApiClient().putFrame(projectId, frameIndex, {
      pixels: pixelsToApi(pixels),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}
