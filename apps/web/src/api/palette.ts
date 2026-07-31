import type { Palette, PutPaletteRequest } from "@pixelanea/api-client";
import { getApiClient } from "./client";
import { logAndMapApiError } from "@/logging/apiError";

/** Map API palette slots to a sparse color array indexed by pixel palette index. */
export function paletteColorsFromApi(palette: Palette): string[] {
  if (palette.colors.length === 0) {
    return [];
  }

  const maxSlot = Math.max(...palette.colors.map((color) => color.slot));
  const colors = Array.from({ length: maxSlot + 1 }, () => "#000000");
  for (const color of palette.colors) {
    colors[color.slot] = color.hex;
  }
  return colors;
}

/**
 * Map preset swatches to API slots 1..N.
 * Slot 0 stays reserved for transparent pixels in the pixel grid.
 */
export function paletteColorsToImportSlots(
  colors: readonly string[],
): PutPaletteRequest {
  return {
    colors: colors.map((hex, index) => ({ slot: index + 1, hex })),
  };
}

/** Mirror import slot layout for preview/editor rendering. */
export function paletteColorsFromPresetSlots(
  colors: readonly string[],
): string[] {
  const sparse = Array.from({ length: colors.length + 1 }, () => "#000000");
  for (let i = 0; i < colors.length; i++) {
    sparse[i + 1] = colors[i]!;
  }
  return sparse;
}

export function paletteColorsToApi(colors: readonly string[]): PutPaletteRequest {
  return {
    colors: colors.map((hex, slot) => ({ slot, hex })),
  };
}

export async function savePalette(
  projectId: string,
  colors: readonly string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await getApiClient().putPalette(projectId, paletteColorsToApi(colors));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("savePalette", error, { projectId }),
    };
  }
}

export async function saveImportPalette(
  projectId: string,
  colors: readonly string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await getApiClient().putPalette(
      projectId,
      paletteColorsToImportSlots(colors),
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("saveImportPalette", error, { projectId }),
    };
  }
}

export async function fetchPalette(
  projectId: string,
): Promise<{ ok: true; palette: Palette } | { ok: false; message: string }> {
  try {
    const palette = await getApiClient().getPalette(projectId);
    return { ok: true, palette };
  } catch (error) {
    return {
      ok: false,
      message: logAndMapApiError("fetchPalette", error, { projectId }),
    };
  }
}
