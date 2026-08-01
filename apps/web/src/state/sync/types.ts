export const SYNC_DEBOUNCE_MS = 500;

export type SyncLane = "frame" | "palette" | "projectSettings";

export type SyncStatus = "idle" | "syncing" | "error";

export type FrameSnapshot = {
  lane: "frame";
  projectId: string;
  frameIndex: number;
  pixels: Uint8Array;
};

export type PaletteSnapshot = {
  lane: "palette";
  projectId: string;
  colors: readonly string[];
};

/** Animation settings live on the project row, so they sync in their own lane. */
export type ProjectSettingsSnapshot = {
  lane: "projectSettings";
  projectId: string;
  fps: number;
  loop: boolean;
};

export type SyncSnapshot =
  | FrameSnapshot
  | PaletteSnapshot
  | ProjectSettingsSnapshot;

export type SyncKey =
  | { lane: "frame"; projectId: string; frameIndex: number }
  | { lane: "palette"; projectId: string }
  | { lane: "projectSettings"; projectId: string };

export function syncKeyToString(key: SyncKey): string {
  if (key.lane === "frame") {
    return `frame:${key.projectId}:${key.frameIndex}`;
  }
  return `${key.lane}:${key.projectId}`;
}

export type SaveResult = { ok: true } | { ok: false; message: string };
