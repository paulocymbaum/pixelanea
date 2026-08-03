export const SYNC_DEBOUNCE_MS = 500;

/** Max cells per PATCH before falling back to full binary PUT. */
export const MAX_DELTA_CELL_COUNT = 64;

export type SyncLane = "frame" | "frameDelta" | "palette" | "projectSettings";

export type SyncStatus = "idle" | "syncing" | "error";

export type FrameSnapshot = {
  lane: "frame";
  projectId: string;
  frameIndex: number;
  pixels: Uint8Array;
};

export type FrameDeltaSnapshot = {
  lane: "frameDelta";
  projectId: string;
  frameIndex: number;
  changes: readonly import("@/state/commands/paintCells").CellChange[];
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
  | FrameDeltaSnapshot
  | PaletteSnapshot
  | ProjectSettingsSnapshot;

export type SyncKey =
  | { lane: "frame"; projectId: string; frameIndex: number }
  | { lane: "frameDelta"; projectId: string; frameIndex: number }
  | { lane: "palette"; projectId: string }
  | { lane: "projectSettings"; projectId: string };

export function syncKeyToString(key: SyncKey): string {
  if (key.lane === "frame" || key.lane === "frameDelta") {
    return `frame:${key.projectId}:${key.frameIndex}`;
  }
  return `${key.lane}:${key.projectId}`;
}

export type SaveResult = { ok: true } | { ok: false; message: string };
