import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { TRANSPARENT_INDEX } from "@/state/commands/types";
import { useEditorStore, useHoverCell } from "@/state/editorStore";
import { useApiStatus, useUiStore } from "@/state/uiStore";

export function StatusBar() {
  const { status, version } = useApiStatus();
  const hoverCell = useHoverCell();
  const showTechnicalInfo = useUiStore((s) => s.showTechnicalInfo);
  const paletteColors = useEditorStore((s) => s.paletteColors);
  const pixels = useEditorStore((s) => s.pixels);
  const gridWidth = useEditorStore((s) => s.gridWidth);

  let message: string;
  if (status === "checking") {
    message = "Checking API…";
  } else if (status === "connected" && version) {
    message = `${copy.apiConnected} · ${copy.apiVersion(version)}`;
  } else if (status === "connected") {
    message = copy.apiConnected;
  } else {
    message = errors.apiDisconnected;
  }

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
      className="flex h-8 shrink-0 items-center justify-between gap-4 border-t border-border bg-surface px-4 font-mono text-sm text-secondary"
      role="status"
    >
      <span
        className={
          status === "disconnected" ? "text-danger" : undefined
        }
      >
        {message}
      </span>
      <span aria-label="Hovered cell">{cellLabel}</span>
    </footer>
  );
}
