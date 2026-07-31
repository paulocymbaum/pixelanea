import type { Palette, PutPaletteRequest } from "@pixelanea/api-client";
import { getApiClient } from "./client";
import { mapApiError } from "./errors";

export function paletteColorsFromApi(palette: Palette): string[] {
  return [...palette.colors]
    .sort((a, b) => a.slot - b.slot)
    .map((color) => color.hex);
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
    return { ok: false, message: mapApiError(error) };
  }
}

export async function fetchPalette(
  projectId: string,
): Promise<{ ok: true; palette: Palette } | { ok: false; message: string }> {
  try {
    const palette = await getApiClient().getPalette(projectId);
    return { ok: true, palette };
  } catch (error) {
    return { ok: false, message: mapApiError(error) };
  }
}
