import { saveFrame } from "@/api/frames";
import { savePalette } from "@/api/palette";
import { useEditorStore } from "./editorStore";

const SYNC_DEBOUNCE_MS = 500;

let frameSyncTimer: ReturnType<typeof setTimeout> | null = null;
let paletteSyncTimer: ReturnType<typeof setTimeout> | null = null;
let frameSyncGeneration = 0;
let paletteSyncGeneration = 0;

export function scheduleFrameSync(): void {
  if (frameSyncTimer) {
    clearTimeout(frameSyncTimer);
  }

  frameSyncTimer = setTimeout(() => {
    frameSyncTimer = null;
    void flushFrameSync();
  }, SYNC_DEBOUNCE_MS);
}

export function schedulePaletteSync(): void {
  if (paletteSyncTimer) {
    clearTimeout(paletteSyncTimer);
  }

  paletteSyncTimer = setTimeout(() => {
    paletteSyncTimer = null;
    void flushPaletteSync();
  }, SYNC_DEBOUNCE_MS);
}

export function cancelFrameSync(): void {
  if (frameSyncTimer) {
    clearTimeout(frameSyncTimer);
    frameSyncTimer = null;
  }
}

export function cancelPaletteSync(): void {
  if (paletteSyncTimer) {
    clearTimeout(paletteSyncTimer);
    paletteSyncTimer = null;
  }
}

export async function flushFrameSync(): Promise<void> {
  const state = useEditorStore.getState();
  const { projectId, activeFrameIndex, pixels, isDirty } = state;

  if (!projectId || !isDirty) {
    return;
  }

  const generation = ++frameSyncGeneration;
  state.setSyncStatus("syncing");

  const result = await saveFrame(projectId, activeFrameIndex, pixels);

  if (generation !== frameSyncGeneration) {
    return;
  }

  if (result.ok) {
    useEditorStore.getState().markFrameSynced();
  } else {
    useEditorStore.getState().setSyncStatus("error", result.message);
  }
}

export async function flushPaletteSync(): Promise<void> {
  const state = useEditorStore.getState();
  const { projectId, paletteColors, isPaletteDirty } = state;

  if (!projectId || !isPaletteDirty) {
    return;
  }

  const generation = ++paletteSyncGeneration;
  state.setSyncStatus("syncing");

  const result = await savePalette(projectId, paletteColors);

  if (generation !== paletteSyncGeneration) {
    return;
  }

  if (result.ok) {
    useEditorStore.getState().markPaletteSynced();
  } else {
    useEditorStore.getState().setSyncStatus("error", result.message);
  }
}

export async function flushAllSync(): Promise<void> {
  cancelFrameSync();
  cancelPaletteSync();
  await flushFrameSync();
  await flushPaletteSync();
}

export function resetPersistState(): void {
  cancelFrameSync();
  cancelPaletteSync();
  frameSyncGeneration++;
  paletteSyncGeneration++;
}
