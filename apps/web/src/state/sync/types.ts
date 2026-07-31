export const SYNC_DEBOUNCE_MS = 500;

export type SyncLane = "frame" | "palette";

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

export type SyncSnapshot = FrameSnapshot | PaletteSnapshot;

export type SyncKey =
  | { lane: "frame"; projectId: string; frameIndex: number }
  | { lane: "palette"; projectId: string };

export function syncKeyToString(key: SyncKey): string {
  if (key.lane === "frame") {
    return `frame:${key.projectId}:${key.frameIndex}`;
  }
  return `palette:${key.projectId}`;
}

export type SaveResult = { ok: true } | { ok: false; message: string };
