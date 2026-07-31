import type { PixelateImportRequest, PixelateImportResponse } from "@pixelanea/api-client";
import { getApiClient } from "./client";
import { logAndMapApiError } from "@/logging/apiError";

export type PixelateResult =
  | { ok: true; response: PixelateImportResponse }
  | { ok: false; message: string };

export async function pixelateImage(
  projectId: string,
  body: PixelateImportRequest,
): Promise<PixelateResult> {
  try {
    const response = await getApiClient().importPixelate(projectId, body);
    return { ok: true, response };
  } catch (error) {
    return { ok: false, message: logAndMapApiError("pixelateImage", error, { projectId }) };
  }
}
