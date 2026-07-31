import { useEditorStore } from "@/state/editorStore";
import type { FrameSnapshot, PaletteSnapshot } from "./types";

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
