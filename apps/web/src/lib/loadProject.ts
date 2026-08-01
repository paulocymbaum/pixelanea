import type { LoadedProject } from "@/api/projects";
import { loadProject } from "@/api/projects";
import { useEditorStore } from "@/state/editorStore";
import { markProjectSettingsSynced, resetPersistState } from "@/state/persist";

export function applyLoadedProjectToEditor(data: LoadedProject): void {
  resetPersistState();
  useEditorStore.getState().setProject({
    projectId: data.projectId,
    name: data.name,
    gridWidth: data.gridWidth,
    gridHeight: data.gridHeight,
    frameCount: data.frameCount,
    pixels: data.pixels,
    paletteColors: data.paletteColors,
    bundlePath: data.bundlePath ?? null,
    assetType: data.assetType,
    fps: data.fps,
    loop: data.loop,
  });
  markProjectSettingsSynced(data.projectId, {
    fps: data.fps,
    loop: data.loop,
  });
}

export async function loadProjectIntoEditor(
  projectId: string,
  options?: { bundlePath?: string | null },
): Promise<{ ok: true; data: LoadedProject } | { ok: false; message: string }> {
  const result = await loadProject(projectId);
  if (!result.ok) {
    return result;
  }
  const data = {
    ...result.data,
    bundlePath: options?.bundlePath ?? result.data.bundlePath,
  };
  applyLoadedProjectToEditor(data);
  return { ok: true, data };
}
