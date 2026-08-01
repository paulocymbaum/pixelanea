import { useEditorStore } from "@/state/editorStore";
import type {
  FrameSnapshot,
  PaletteSnapshot,
  ProjectSettingsSnapshot,
} from "./types";

/**
 * Last fps/loop the server acknowledged for a project. Animation settings can
 * change without going through a store action, so the lane diffs live state
 * against this instead of relying on a dirty flag.
 */
let syncedProjectSettings: {
  projectId: string;
  fps: number;
  loop: boolean;
} | null = null;

export function captureFrameSnapshot(): FrameSnapshot | null {
  const state = useEditorStore.getState();
  if (!state.projectId || !state.isDirty) {
    return null;
  }

  return {
    lane: "frame",
    projectId: state.projectId,
    frameIndex: state.activeFrameIndex,
    pixels: new Uint8Array(state.pixels),
  };
}

export function capturePaletteSnapshot(): PaletteSnapshot | null {
  const state = useEditorStore.getState();
  if (!state.projectId || !state.isPaletteDirty) {
    return null;
  }

  return {
    lane: "palette",
    projectId: state.projectId,
    colors: [...state.paletteColors],
  };
}

export function captureProjectSettingsSnapshot(): ProjectSettingsSnapshot | null {
  const state = useEditorStore.getState();
  if (!state.projectId) {
    return null;
  }

  const snapshot: ProjectSettingsSnapshot = {
    lane: "projectSettings",
    projectId: state.projectId,
    fps: state.animationFps,
    loop: state.animationLoop,
  };

  const synced = syncedProjectSettings;
  const matchesServer =
    synced !== null &&
    synced.projectId === snapshot.projectId &&
    synced.fps === snapshot.fps &&
    synced.loop === snapshot.loop;

  return matchesServer ? null : snapshot;
}

/** Record the fps/loop the server now holds, so the lane can skip no-op writes. */
export function markProjectSettingsSynced(
  projectId: string,
  settings: { fps: number; loop: boolean },
): void {
  syncedProjectSettings = { projectId, ...settings };
}

export function forgetProjectSettingsSynced(): void {
  syncedProjectSettings = null;
}
