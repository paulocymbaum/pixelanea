import { copy } from "@/content/copy";
import { useUiStore } from "@/state/uiStore";

/** Show a factual success toast after a browser PNG export download starts. */
export function notifyExportSuccess(filename: string): void {
  useUiStore.getState().showToast(copy.exportPngSuccessToast(filename));
}
