import { copy } from "@/content/copy";
import { useUiStore } from "@/state/uiStore";

type ExportToastKind = "png" | "spritesheet" | "gif";

function exportToastMessage(kind: ExportToastKind, filename: string): string {
  switch (kind) {
    case "png":
      return copy.exportPngSuccessToast(filename);
    case "spritesheet":
      return copy.exportSpritesheetSuccessToast(filename);
    case "gif":
      return copy.exportGifSuccessToast(filename);
  }
}

/** Show a factual success toast after a browser export download starts. */
export function notifyExportSuccess(
  filename: string,
  kind: ExportToastKind = "png",
): void {
  useUiStore.getState().showToast(exportToastMessage(kind, filename));
}
