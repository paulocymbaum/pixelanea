import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  useCanRedo,
  useCanUndo,
  useEditorStore,
} from "@/state/editorStore";
import { Redo2, Undo2 } from "lucide-react";

type UndoRedoToolbarProps = {
  className?: string;
};

export function UndoRedoToolbar({ className }: UndoRedoToolbarProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-panel border border-border bg-elevated/95 p-1 shadow-sm",
        className,
      )}
      role="toolbar"
      aria-label={copy.undoRedoToolbarLabel}
    >
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className="flex min-h-10 min-w-10 items-center gap-2 rounded-button px-3 text-base text-primary transition-colors hover:bg-accent-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        aria-label={copy.undo}
      >
        <Undo2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{copy.undo}</span>
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className="flex min-h-10 min-w-10 items-center gap-2 rounded-button px-3 text-base text-primary transition-colors hover:bg-accent-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        aria-label={copy.redo}
      >
        <Redo2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{copy.redo}</span>
      </button>
    </div>
  );
}
