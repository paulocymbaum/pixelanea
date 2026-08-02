import {
  downloadBlob,
  exportFilename,
  exportFrameToPng,
  exportGifFilename,
  exportSpritesheetFilename,
  exportSpritesheetToPng,
} from "@/canvas/exportFrame";
import {
  scanFramesForOffPalette,
  type OffPaletteReport,
} from "@/canvas/offPaletteCheck";
import { errors } from "@/content/errors";
import { notifyExportSuccess } from "@/lib/exportNotify";
import { useEditorStore } from "@/state/editorStore";
import { resolveAllFramePixels } from "@/state/frameCache";
import { flushFrameSync } from "@/state/persist";
import { useUiStore } from "@/state/uiStore";
import { useCallback, useRef, useState } from "react";
import { mapApiError } from "@/api/errors";
import { exportProjectGif } from "@/api/export";

export type PreparedActiveFrame = {
  pixels: Uint8Array;
  gridWidth: number;
  gridHeight: number;
  paletteColors: readonly string[];
  projectName: string;
  activeFrameIndex: number;
};

export type PreparedAllFrames =
  | {
      ok: true;
      frames: Uint8Array[];
      paletteLength: number;
    }
  | { ok: false; message?: string };

/** Flush dirty active frame, then return current editor pixels for single-frame export. */
export async function prepareActiveFrameForExport(): Promise<
  PreparedActiveFrame | null
> {
  const state = useEditorStore.getState();
  if (!state.projectId) {
    return null;
  }

  if (state.isDirty) {
    await flushFrameSync();
  }

  return {
    pixels: state.pixels,
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    paletteColors: state.paletteColors,
    projectName: state.projectName,
    activeFrameIndex: state.activeFrameIndex,
  };
}

/** Flush dirty frame, then load every frame buffer for multi-frame export. */
export async function prepareAllFramesForExport(): Promise<PreparedAllFrames> {
  const state = useEditorStore.getState();
  if (!state.projectId) {
    return { ok: false };
  }

  if (state.isDirty) {
    await flushFrameSync();
  }

  const result = await resolveAllFramePixels({
    projectId: state.projectId,
    frameCount: state.frameCount,
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    activeFrameIndex: state.activeFrameIndex,
    activePixels: state.pixels,
    framePixelsByIndex: state.framePixelsByIndex,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return {
    ok: true,
    frames: result.frames,
    paletteLength: state.paletteColors.length,
  };
}

export function performPngExport(frame: PreparedActiveFrame): void {
  const filename = exportFilename(frame.projectName, frame.activeFrameIndex);
  exportFrameToPng({
    pixels: frame.pixels,
    gridWidth: frame.gridWidth,
    gridHeight: frame.gridHeight,
    paletteColors: frame.paletteColors,
    filename,
  });
  notifyExportSuccess(filename, "png");
}

export function performSpritesheetExport(
  frames: readonly Uint8Array[],
  gridWidth: number,
  gridHeight: number,
  paletteColors: readonly string[],
  projectName: string,
): void {
  const filename = exportSpritesheetFilename(projectName);
  exportSpritesheetToPng({
    frames,
    gridWidth,
    gridHeight,
    paletteColors,
    filename,
  });
  notifyExportSuccess(filename, "spritesheet");
}

export async function performGifExport(
  projectId: string,
  projectName: string,
  fps: number,
): Promise<void> {
  const blob = await exportProjectGif(projectId, { fps });
  const filename = exportGifFilename(projectName);
  downloadBlob(blob, filename);
  notifyExportSuccess(filename, "gif");
}

export async function exportActiveFramePng(): Promise<void> {
  const frame = await prepareActiveFrameForExport();
  if (!frame) {
    return;
  }
  performPngExport(frame);
}

type OffPaletteGuard = (
  frames: readonly Uint8Array[],
  paletteLength: number,
  proceed: () => void,
) => void;

/** Named async entry for File → Export PNG (off-palette guard applied by caller). */
export async function runPngExport(guard: OffPaletteGuard): Promise<void> {
  const frame = await prepareActiveFrameForExport();
  if (!frame) {
    return;
  }

  guard([frame.pixels], frame.paletteColors.length, () => {
    performPngExport(frame);
  });
}

/** File → Export spritesheet — all frames in a horizontal PNG strip. */
export async function runSpritesheetExport(guard: OffPaletteGuard): Promise<void> {
  const prepared = await prepareAllFramesForExport();
  if (!prepared.ok) {
    if (prepared.message) {
      useUiStore.getState().showToast(prepared.message);
    }
    return;
  }

  const state = useEditorStore.getState();
  guard(prepared.frames, prepared.paletteLength, () => {
    performSpritesheetExport(
      prepared.frames,
      state.gridWidth,
      state.gridHeight,
      state.paletteColors,
      state.projectName,
    );
  });
}

/** File → Export GIF — server-encoded animation using project FPS. */
export async function runGifExport(guard: OffPaletteGuard): Promise<void> {
  const state = useEditorStore.getState();
  if (!state.projectId) {
    return;
  }

  if (state.frameCount < 2) {
    useUiStore.getState().showToast(errors.exportGifInsufficientFrames);
    return;
  }

  const prepared = await prepareAllFramesForExport();
  if (!prepared.ok) {
    if (prepared.message) {
      useUiStore.getState().showToast(prepared.message);
    }
    return;
  }

  guard(prepared.frames, prepared.paletteLength, () => {
    void performGifExport(state.projectId!, state.projectName, state.animationFps).catch(
      (error) => {
        const message = mapApiError(error);
        useUiStore.getState().showToast(
          message.includes("insufficient") || message.includes("gif")
            ? errors.exportGifInsufficientFrames
            : errors.exportGifFailed,
        );
      },
    );
  });
}

export function useOffPaletteExportGuard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [report, setReport] = useState<OffPaletteReport | null>(null);
  const pendingExportRef = useRef<(() => void) | null>(null);

  const runGuardedExport = useCallback(
    (
      frames: readonly Uint8Array[],
      paletteLength: number,
      proceed: () => void,
    ) => {
      const scan = scanFramesForOffPalette(frames, paletteLength);
      if (!scan.hasOffPalette) {
        proceed();
        return;
      }

      pendingExportRef.current = proceed;
      setReport(scan);
      setDialogOpen(true);
    },
    [],
  );

  const handleConfirm = () => {
    setDialogOpen(false);
    pendingExportRef.current?.();
    pendingExportRef.current = null;
    setReport(null);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      pendingExportRef.current = null;
      setReport(null);
    }
  };

  return {
    dialogOpen,
    report,
    runGuardedExport,
    handleConfirm,
    handleOpenChange,
  };
}
