import { getApiClient } from "@/api/client";
import type { ExportGifRequest } from "@pixelanea/api-client";

export async function exportProjectGif(
  projectId: string,
  options?: ExportGifRequest,
): Promise<Blob> {
  return getApiClient().exportGif(projectId, options);
}
