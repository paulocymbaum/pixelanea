import type { ResolutionPreset } from "@/components/import/resolutionPresets";

/** Matches CreateProjectRequest width/height bounds in contracts/openapi.yaml */
export const CANVAS_SIZE_MIN = 1;
export const CANVAS_SIZE_MAX = 512;

export type CanvasSize = {
  width: number;
  height: number;
};

export function formatCanvasSize(size: CanvasSize): string {
  return `${size.width}×${size.height}`;
}

export function matchesResolutionPreset(
  size: CanvasSize,
  preset: ResolutionPreset,
): boolean {
  return size.width === preset && size.height === preset;
}

export function isPresetCanvasSize(size: CanvasSize): boolean {
  return (
    size.width === size.height &&
    (size.width === 16 ||
      size.width === 32 ||
      size.width === 64 ||
      size.width === 128 ||
      size.width === 256)
  );
}

export function clampCanvasDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return CANVAS_SIZE_MIN;
  }
  return Math.min(
    CANVAS_SIZE_MAX,
    Math.max(CANVAS_SIZE_MIN, Math.round(value)),
  );
}

export function parseCanvasDimensionInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(value)) {
    return null;
  }
  return value;
}

export function isValidCanvasSize(size: CanvasSize): boolean {
  return (
    Number.isInteger(size.width) &&
    Number.isInteger(size.height) &&
    size.width >= CANVAS_SIZE_MIN &&
    size.width <= CANVAS_SIZE_MAX &&
    size.height >= CANVAS_SIZE_MIN &&
    size.height <= CANVAS_SIZE_MAX
  );
}
