import { mapApiError } from "@/api/errors";
import { errorDetail, logger } from "@/logging/logger";

export function logAndMapApiError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>,
): string {
  logger.error("api", `${operation}_failed`, {
    ...context,
    error: errorDetail(error),
  });
  return mapApiError(error);
}
