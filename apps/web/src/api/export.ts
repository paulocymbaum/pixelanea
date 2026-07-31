import { getApiClient } from "@/api/client";
import type { ExportGifRequest } from "@pixelanea/api-client";
import { logAndMapApiError } from "@/logging/apiError";

export async function exportProjectGif(
  projectId: string,
  options?: ExportGifRequest,
): Promise<Blob> {
  try {
    return await getApiClient().exportGif(projectId, options);
  } catch (error) {
    logAndMapApiError("exportProjectGif", error, { projectId });
    throw error;
  }
}
