import { errors as contentErrors } from "@/content/errors";
import { ApiError } from "@pixelanea/api-client";

export function mapApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.body?.message ?? error.message;
  }
  return contentErrors.apiDisconnected;
}
