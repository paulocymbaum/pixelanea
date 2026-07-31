import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import {
  useEditorStore,
  useIsPaletteDirty,
  usePaletteLocked,
} from "@/state/editorStore";

type PaletteSaveButtonProps = {
  className?: string;
};

export function PaletteSaveButton({ className }: PaletteSaveButtonProps) {
  const isDirty = useIsPaletteDirty();
  const locked = usePaletteLocked();
  const syncStatus = useEditorStore((s) => s.syncStatus);
  const savePalette = useEditorStore((s) => s.savePalette);

  const isSyncing = syncStatus === "syncing";

  return (
    <div className={cn("border-t border-border p-3", className)}>
      <Button
        type="button"
        variant="primary"
        size="default"
        disabled={!isDirty || locked || isSyncing}
        onClick={() => savePalette()}
        className="min-h-10 w-full"
        title={copy.paletteSavePaletteDescription}
      >
        {copy.paletteSavePalette}
      </Button>
    </div>
  );
}
