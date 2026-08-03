import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { copy } from "@/content/copy";
import { useUiStore } from "@/state/uiStore";

type ShortcutRow = {
  keys: string;
  label: string;
};

const TOOL_ROWS: ShortcutRow[] = [
  { keys: "B", label: copy.shortcutPaint },
  { keys: "E", label: copy.shortcutEraser },
  { keys: "I", label: copy.shortcutEyedropper },
  { keys: "G", label: copy.shortcutFill },
  { keys: "L", label: copy.shortcutLine },
  { keys: "M", label: copy.shortcutSelect },
  { keys: "H", label: copy.shortcutHand },
];

const COLOR_ROWS: ShortcutRow[] = Array.from({ length: 9 }, (_, index) => ({
  keys: String(index + 1),
  label: copy.shortcutPaletteSlot(index + 1),
}));

const EDIT_ROWS: ShortcutRow[] = [
  { keys: "Ctrl+Z", label: copy.shortcutUndo },
  { keys: "Ctrl+Shift+Z", label: copy.shortcutRedo },
  { keys: "Ctrl+C", label: copy.shortcutCopy },
  { keys: "Ctrl+X", label: copy.shortcutCut },
  { keys: "Ctrl+V", label: copy.shortcutPaste },
  { keys: "Enter", label: copy.shortcutPasteCommit },
  { keys: "Esc", label: copy.shortcutPasteCancel },
  { keys: "↑ ↓ ← →", label: copy.shortcutPasteNudge },
];

const VIEW_ROWS: ShortcutRow[] = [
  { keys: "—", label: copy.shortcutZoomIn },
  { keys: "—", label: copy.shortcutZoomOut },
  { keys: "—", label: copy.shortcutZoomFit },
  { keys: "?", label: copy.shortcutShortcutsOverlay },
];

const PALETTE_ROWS: ShortcutRow[] = [
  { keys: "Alt+1", label: copy.shortcutPaletteSectionSwatches },
  { keys: "Alt+2", label: copy.shortcutPaletteSectionPresets },
  { keys: "Alt+3", label: copy.shortcutPaletteSectionShading },
  { keys: "Alt+4", label: copy.shortcutPaletteSectionFilters },
  { keys: "[", label: copy.shortcutPaletteSectionPrev },
  { keys: "]", label: copy.shortcutPaletteSectionNext },
];

function ShortcutSection({
  title,
  rows,
}: {
  title: string;
  rows: ShortcutRow[];
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <dl className="mt-2 space-y-1">
        {rows.map((row) => (
          <div
            key={`${title}-${row.keys}-${row.label}`}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <dt className="text-secondary">{row.label}</dt>
            <dd>
              <kbd className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs text-primary">
                {row.keys}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ShortcutsOverlay() {
  const open = useUiStore((s) => s.shortcutsOverlayOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOverlayOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby="shortcuts-description">
        <DialogHeader>
          <DialogTitle>{copy.shortcutsOverlayTitle}</DialogTitle>
          <DialogDescription id="shortcuts-description">
            {copy.shortcutsOverlayDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2">
          <ShortcutSection title={copy.shortcutsOverlayTools} rows={TOOL_ROWS} />
          <ShortcutSection title={copy.shortcutsOverlayColors} rows={COLOR_ROWS} />
          <ShortcutSection title={copy.shortcutsOverlayEdit} rows={EDIT_ROWS} />
          <ShortcutSection title={copy.shortcutsOverlayPalette} rows={PALETTE_ROWS} />
          <ShortcutSection title={copy.shortcutsOverlayView} rows={VIEW_ROWS} />
        </div>

        <div className="mt-2 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {copy.shortcutsOverlayClose}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
