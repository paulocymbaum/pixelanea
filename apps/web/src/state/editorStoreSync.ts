export type SyncStatus = "idle" | "syncing" | "error";

export type LaneSyncFields = {
  frameSyncStatus: SyncStatus;
  paletteSyncStatus: SyncStatus;
  frameSyncError: string | null;
  paletteSyncError: string | null;
};

export function deriveSyncStatus(
  frameSyncStatus: SyncStatus,
  paletteSyncStatus: SyncStatus,
): SyncStatus {
  if (frameSyncStatus === "error" || paletteSyncStatus === "error") {
    return "error";
  }
  if (frameSyncStatus === "syncing" || paletteSyncStatus === "syncing") {
    return "syncing";
  }
  return "idle";
}

export function deriveSyncError(
  frameSyncError: string | null,
  paletteSyncError: string | null,
): string | null {
  return frameSyncError ?? paletteSyncError;
}

export function withFrameSyncStatus(
  state: LaneSyncFields,
  status: SyncStatus,
  error: string | null = null,
): Partial<LaneSyncFields> {
  return {
    frameSyncStatus: status,
    frameSyncError: status === "error" ? error : null,
  };
}

export function withPaletteSyncStatus(
  state: LaneSyncFields,
  status: SyncStatus,
  error: string | null = null,
): Partial<LaneSyncFields> {
  return {
    paletteSyncStatus: status,
    paletteSyncError: status === "error" ? error : null,
  };
}
