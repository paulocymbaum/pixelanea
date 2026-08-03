import { saveFrame, saveFrameCells } from "@/api/frames";
import { savePalette } from "@/api/palette";
import { updateProjectSettings } from "@/api/projects";
import type { SaveResult } from "./sync/types";
import { useEditorStore } from "./editorStore";
import {
  captureFrameDeltaSnapshot,
  captureFrameSnapshot,
  capturePaletteSnapshot,
  captureProjectSettingsSnapshot,
  forgetProjectSettingsSynced,
  markProjectSettingsSynced,
} from "./sync/snapshots";
import { clearPendingCellChanges } from "./sync/pendingCellChanges";
import { SyncCoordinator } from "./sync/syncCoordinator";

let coordinator = createCoordinator();

async function saveProjectSettings(
  projectId: string,
  settings: { fps: number; loop: boolean },
): Promise<SaveResult> {
  const result = await updateProjectSettings(projectId, settings);
  if (result.ok) {
    markProjectSettingsSynced(projectId, settings);
  }
  return result;
}

function createCoordinator(): SyncCoordinator {
  return new SyncCoordinator({
    saveFrame,
    saveFrameDelta: saveFrameCells,
    savePalette,
    saveProjectSettings,
    getFrameSnapshot: captureFrameSnapshot,
    getFrameDeltaSnapshot: captureFrameDeltaSnapshot,
    getPaletteSnapshot: capturePaletteSnapshot,
    getProjectSettingsSnapshot: captureProjectSettingsSnapshot,
    frameCallbacks: {
      onSyncing: () => useEditorStore.getState().setFrameSyncStatus("syncing"),
      onSuccess: () => {
        clearPendingCellChanges();
        useEditorStore.getState().markFrameSynced();
      },
      onError: (message) =>
        useEditorStore.getState().setFrameSyncStatus("error", message),
    },
    paletteCallbacks: {
      onSyncing: () => useEditorStore.getState().setPaletteSyncStatus("syncing"),
      onSuccess: () => useEditorStore.getState().markPaletteSynced(),
      onError: (message) =>
        useEditorStore.getState().setPaletteSyncStatus("error", message),
    },
    // Animation settings have no status indicator of their own: the coordinator
    // logs failures and the next flush retries from live store state.
    projectSettingsCallbacks: {
      onSyncing: () => {},
      onSuccess: () => {},
      onError: () => {},
    },
  });
}

export function scheduleFrameSync(): void {
  coordinator.scheduleFrame();
}

export function schedulePaletteSync(): void {
  coordinator.schedulePalette();
}

export function scheduleProjectSettingsSync(): void {
  coordinator.scheduleProjectSettings();
}

export function cancelFrameSync(): void {
  coordinator.cancelFrame();
}

export function cancelPaletteSync(): void {
  coordinator.cancelPalette();
}

export async function flushFrameSync(): Promise<void> {
  await coordinator.flushFrame();
}

export async function flushPaletteSync(): Promise<void> {
  await coordinator.flushPalette();
}

export async function flushProjectSettingsSync(): Promise<void> {
  await coordinator.flushProjectSettings();
}

export async function flushAllSync(): Promise<void> {
  await coordinator.flushAll();
}

export function resetPersistState(): void {
  coordinator.reset();
  clearPendingCellChanges();
  forgetProjectSettingsSynced();
}

export { markProjectSettingsSynced };

/** @internal Test hook */
export function setSyncCoordinatorForTests(next: SyncCoordinator | null): void {
  coordinator = next ?? createCoordinator();
}

export { SyncCoordinator } from "./sync/syncCoordinator";
