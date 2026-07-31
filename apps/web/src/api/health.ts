import type { HealthResponse } from "@pixelanea/api-client";
import { ApiError } from "@pixelanea/api-client";
import { errors } from "@/content/errors";
import { getApiClient } from "./client";

export type HealthCheckResult =
  | { ok: true; health: HealthResponse }
  | { ok: false; message: string };

export async function checkHealth(): Promise<HealthCheckResult> {
  try {
    const health = await getApiClient().getHealth();
    return { ok: true, health };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, message: errors.apiCheckFailed };
    }
    return { ok: false, message: errors.apiDisconnected };
  }
}
