import { fetchFrame, pixelsFromFrame } from "@/api/frames";

/** Clone pixel buffer for per-frame cache entries. */
export function clonePixels(pixels: Uint8Array): Uint8Array {
  return new Uint8Array(pixels);
}

export type ResolveAllFramesParams = {
  projectId: string;
  frameCount: number;
  gridWidth: number;
  gridHeight: number;
  activeFrameIndex: number;
  activePixels: Uint8Array;
  framePixelsByIndex: Record<number, Uint8Array>;
};

/** Load every frame pixel buffer in order, fetching uncached frames from the API. */
export async function resolveAllFramePixels(
  params: ResolveAllFramesParams,
): Promise<
  | {
      ok: true;
      frames: Uint8Array[];
      framePixelsByIndex: Record<number, Uint8Array>;
    }
  | { ok: false; message: string }
> {
  const {
    projectId,
    frameCount,
    gridWidth,
    gridHeight,
    activeFrameIndex,
    activePixels,
    framePixelsByIndex,
  } = params;

  let cache = writeFramePixels(
    framePixelsByIndex,
    activeFrameIndex,
    activePixels,
  );

  const frames: (Uint8Array | undefined)[] = new Array(frameCount);
  const missing: number[] = [];

  for (let i = 0; i < frameCount; i++) {
    const cached = cache[i];
    if (cached) {
      frames[i] = cached;
    } else {
      missing.push(i);
    }
  }

  if (missing.length > 0) {
    const results = await Promise.all(
      missing.map(async (index) => {
        const result = await fetchFrame(projectId, index);
        return { index, result };
      }),
    );

    for (const { index, result } of results) {
      if (!result.ok) {
        return { ok: false, message: result.message };
      }
      const pixels = pixelsFromFrame(result.frame);
      cache = writeFramePixels(cache, index, pixels);
      frames[index] = pixels;
    }
  }

  const ordered: Uint8Array[] = [];
  for (let i = 0; i < frameCount; i++) {
    ordered.push(frames[i] ?? new Uint8Array(gridWidth * gridHeight));
  }

  return { ok: true, frames: ordered, framePixelsByIndex: cache };
}

export function readFramePixels(
  cache: Record<number, Uint8Array>,
  index: number,
): Uint8Array | undefined {
  return cache[index];
}

export function writeFramePixels(
  cache: Record<number, Uint8Array>,
  index: number,
  pixels: Uint8Array,
): Record<number, Uint8Array> {
  return { ...cache, [index]: clonePixels(pixels) };
}
