import { exportFilename, exportFrameToPng } from "@/canvas/exportFrame";
import {
  scanFramesForOffPalette,
  type OffPaletteReport,
} from "@/canvas/offPaletteCheck";
import { notifyExportSuccess } from "@/lib/exportNotify";
import { useEditorStore } from "@/state/editorStore";
import { resolveAllFramePixels } from "@/state/frameCache";
import { flushFrameSync } from "@/state/persist";
import { useCallback, useRef, useState } from "react";

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
  notifyExportSuccess(filename);
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
export async function runPngExport(
  guard: OffPaletteGuard,
): Promise<void> {
  const frame = await prepareActiveFrameForExport();
  if (!frame) {
    return;
  }

  guard([frame.pixels], frame.paletteColors.length, () => {
    performPngExport(frame);
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
