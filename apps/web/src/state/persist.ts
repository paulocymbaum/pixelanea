import { saveFrame } from "@/api/frames";
import { savePalette } from "@/api/palette";
import { useEditorStore } from "./editorStore";
import { captureFrameSnapshot, capturePaletteSnapshot } from "./sync/snapshots";
import { SyncCoordinator } from "./sync/syncCoordinator";

let coordinator = createCoordinator();

function createCoordinator(): SyncCoordinator {
  return new SyncCoordinator({
    saveFrame,
    savePalette,
    getFrameSnapshot: captureFrameSnapshot,
    getPaletteSnapshot: capturePaletteSnapshot,
    frameCallbacks: {
      onSyncing: () => useEditorStore.getState().setFrameSyncStatus("syncing"),
      onSuccess: () => useEditorStore.getState().markFrameSynced(),
      onError: (message) =>
        useEditorStore.getState().setFrameSyncStatus("error", message),
    },
    paletteCallbacks: {
      onSyncing: () => useEditorStore.getState().setPaletteSyncStatus("syncing"),
      onSuccess: () => useEditorStore.getState().markPaletteSynced(),
      onError: (message) =>
        useEditorStore.getState().setPaletteSyncStatus("error", message),
    },
  });
}

export function scheduleFrameSync(): void {
  coordinator.scheduleFrame();
}

export function schedulePaletteSync(): void {
  coordinator.schedulePalette();
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

export async function flushAllSync(): Promise<void> {
  await coordinator.flushAll();
}

export function resetPersistState(): void {
  coordinator.reset();
}

/** @internal Test hook */
export function setSyncCoordinatorForTests(next: SyncCoordinator | null): void {
  coordinator = next ?? createCoordinator();
}

export { SyncCoordinator } from "./sync/syncCoordinator";
