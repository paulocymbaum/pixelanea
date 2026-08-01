import { checkHealth, type HealthCheckResult } from "@/api/health";
import type { useUiStore } from "@/state/uiStore";

type SetApiStatus = ReturnType<typeof useUiStore.getState>["setApiStatus"];

export function applyHealthCheckResult(
  result: HealthCheckResult,
  setApiStatus: SetApiStatus,
): void {
  if (result.ok) {
    setApiStatus("connected", result.health.version);
  } else {
    setApiStatus("disconnected");
  }
}

export async function retryApiHealthCheck(
  setApiStatus: SetApiStatus,
): Promise<void> {
  setApiStatus("checking");
  const result = await checkHealth();
  applyHealthCheckResult(result, setApiStatus);
}
