import { useEffect } from "react";
import { fetchFrame, pixelsFromFrame } from "@/api/frames";
import { fetchPalette, paletteColorsFromApi } from "@/api/palette";
import { createBlankProject } from "@/api/projects";
import { useEditorStore } from "@/state/editorStore";
import { resetPersistState } from "@/state/persist";
import { useUiStore } from "@/state/uiStore";

export function useProjectBootstrap(apiConnected: boolean) {
  const setProject = useEditorStore((s) => s.setProject);
  const projectId = useEditorStore((s) => s.projectId);
  const setApiStatus = useUiStore((s) => s.setApiStatus);
  const apiVersion = useUiStore((s) => s.apiVersion);

  useEffect(() => {
    if (!apiConnected || projectId) {
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      const created = await createBlankProject();
      if (cancelled) {
        return;
      }
      if (!created.ok) {
        setApiStatus("disconnected");
        return;
      }

      const { project } = created;
      const [paletteResult, frameResult] = await Promise.all([
        fetchPalette(project.id),
        fetchFrame(project.id, 0),
      ]);

      if (cancelled) {
        return;
      }

      if (!paletteResult.ok || !frameResult.ok) {
        setApiStatus("disconnected");
        return;
      }

      setProject({
        projectId: project.id,
        name: project.name,
        gridWidth: project.width,
        gridHeight: project.height,
        frameCount: project.frameCount,
        pixels: pixelsFromFrame(frameResult.frame),
        paletteColors: paletteColorsFromApi(paletteResult.palette),
      });
    }

    void bootstrap();

    return () => {
      cancelled = true;
      resetPersistState();
    };
  }, [apiConnected, projectId, setApiStatus, setProject]);

  return { projectId, apiVersion };
}
