import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { FrameDuplicateDialog } from "./FrameDuplicateDialog";

export function FrameStripPlaceholder() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div
      className="flex h-16 shrink-0 items-center justify-center border-t border-border bg-surface px-4"
      aria-label={copy.frameStripLabel}
    >
      <Button
        type="button"
        variant="primary"
        className="min-h-10"
        onClick={() => setDialogOpen(true)}
      >
        {copy.frameStripAddFramesCta}
      </Button>
      <FrameDuplicateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
