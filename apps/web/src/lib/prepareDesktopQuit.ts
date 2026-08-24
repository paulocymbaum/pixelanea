import {
  getEditorNavigationGuardState,
  needsNavigationGuard,
} from "@/lib/unsavedGuard";
import { useEditorStore } from "@/state/editorStore";
import { flushAllSync } from "@/state/persist";

export type PrepareQuitResult = {
  /** True when the editor flushed successfully and nothing remains that needs a warn. */
  ok: boolean;
};

/**
 * Desktop shell quit hook: flush sync lanes before the Tauri process kills the server.
 * Returns ok:false when dirty/error remains so the shell can warn before force-quit.
 */
export async function prepareDesktopQuit(): Promise<PrepareQuitResult> {
  const state = useEditorStore.getState();
  if (!state.projectId) {
    return { ok: true };
  }

  try {
    await flushAllSync();
  } catch {
    return { ok: false };
  }

  if (needsNavigationGuard(getEditorNavigationGuardState())) {
    return { ok: false };
  }

  const after = useEditorStore.getState();
  if (after.frameSyncStatus === "error" || after.paletteSyncStatus === "error") {
    return { ok: false };
  }

  return { ok: true };
}
