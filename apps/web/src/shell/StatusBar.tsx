import { copy } from "@/content/copy";
import { useDerivedProjectStatus, type ProjectStatus } from "@/lib/projectStatus";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import {
  useActiveFrameIndex,
  useActiveTool,
  useEditorStore,
  useFrameCount,
  useHoverCell,
  useSelectionMoving,
} from "@/state/editorStore";
import { useApiStatus, useUiStore } from "@/state/uiStore";

function primaryStatusText(
  projectStatus: ProjectStatus,
  showTechnicalInfo: boolean,
  version: string | null,
): string {
  let message: string;
  switch (projectStatus.kind) {
    case "idle":
      message = projectStatus.label ?? "";
      break;
    case "checking":
      message = copy.statusChecking;
      break;
    default:
      message = projectStatus.label;
  }

  if (showTechnicalInfo && version) {
    const tech = copy.apiVersion(version);
    return message ? `${message} · ${tech}` : tech;
  }

  return message;
}

export function StatusBar() {
  const projectStatus = useDerivedProjectStatus();
  const { version } = useApiStatus();
  const hoverCell = useHoverCell();
  const activeTool = useActiveTool();
  const pastePreview = useEditorStore((s) => s.pastePreview);
  const movePreview = useEditorStore((s) => s.movePreview);
  const clipboard = useEditorStore((s) => s.clipboard);
  const selectionMoving = useSelectionMoving();
  const frameIndex = useActiveFrameIndex();
  const frameCount = useFrameCount();
  const showTechnicalInfo = useUiStore((s) => s.showTechnicalInfo);
  const paletteColors = useEditorStore((s) => s.paletteColors);
  const pixels = useEditorStore((s) => s.pixels);
  const gridWidth = useEditorStore((s) => s.gridWidth);

  const message = primaryStatusText(
    projectStatus,
    showTechnicalInfo,
    version,
  );

  const toolHint = selectionMoving
    ? copy.selectionMoving
    : pastePreview
      ? copy.pasteModeHint
      : movePreview
        ? copy.moveModeHint
        : clipboard
          ? copy.clipboardReadyHint
          : activeTool === "select"
            ? copy.selectToolHint
            : null;
  const statusMessage = toolHint
    ? message
      ? `${message} · ${toolHint}`
      : toolHint
    : message;

  const emphasize = projectStatus.kind === "error";

  let cellLabel: string = copy.hoverCellNone;
  if (hoverCell) {
    if (showTechnicalInfo) {
      const index = pixels[hoverCell.y * gridWidth + hoverCell.x] ?? TRANSPARENT_INDEX;
      if (index === TRANSPARENT_INDEX) {
        cellLabel = copy.hoverCellTechnicalTransparent(hoverCell.x, hoverCell.y);
      } else {
        const hex = paletteColors[index] ?? "#000000";
        cellLabel = copy.hoverCellTechnical(
          hoverCell.x,
          hoverCell.y,
          hex,
          index,
        );
      }
    } else {
      cellLabel = copy.hoverCell(hoverCell.x, hoverCell.y);
    }
  }

  return (
    <footer
      className="flex h-8 shrink-0 items-center justify-between gap-4 border-t border-border bg-surface px-4 font-sans text-sm text-secondary"
      role="status"
    >
      <span className={emphasize ? "text-danger" : undefined}>{statusMessage}</span>
      <div className="flex items-center gap-4">
        {frameCount > 1 ? (
          <span aria-label={copy.frameStatus(frameIndex, frameCount)}>
            {copy.frameStatus(frameIndex, frameCount)}
          </span>
        ) : null}
        <span aria-label="Hovered cell">{cellLabel}</span>
      </div>
    </footer>
  );
}
