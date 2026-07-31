import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { useEditorStore, usePaletteLocked } from "@/state/editorStore";
import { Lock, Unlock } from "lucide-react";

type PaletteLockProps = {
  className?: string;
};

export function PaletteLock({ className }: PaletteLockProps) {
  const locked = usePaletteLocked();
  const setPaletteLocked = useEditorStore((s) => s.setPaletteLocked);

  return (
    <Button
      type="button"
      variant={locked ? "primary" : "secondary"}
      size="default"
      onClick={() => setPaletteLocked(!locked)}
      aria-pressed={locked}
      aria-label={locked ? copy.paletteUnlock : copy.paletteLock}
      title={copy.paletteLockDescription}
      className={cn("min-h-10", className)}
    >
      {locked ? (
        <Lock className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <Unlock className="h-4 w-4" strokeWidth={1.5} />
      )}
      {locked ? copy.paletteLock : copy.paletteUnlock}
    </Button>
  );
}
