import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { useHoverCell } from "@/state/editorStore";
import { useApiStatus } from "@/state/uiStore";

export function StatusBar() {
  const { status, version } = useApiStatus();
  const hoverCell = useHoverCell();

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

  const cellLabel = hoverCell
    ? copy.hoverCell(hoverCell.x, hoverCell.y)
    : copy.hoverCellNone;

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
