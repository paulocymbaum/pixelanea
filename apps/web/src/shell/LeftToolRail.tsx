import { useState } from "react";
import { FrameDuplicateDialog } from "@/components/frames/FrameDuplicateDialog";
import { toolButtonVariants } from "@/components/ui/tool-button";
import { copy } from "@/content/copy";
import { tools } from "@/content/tools";
import { cn } from "@/lib/cn";
import { useActiveTool, useEditorStore } from "@/state/editorStore";
import { PAINT_TOOL_IDS, type ToolId } from "@/tools/registry";
import {
  Copy,
  Eraser,
  PaintBucket,
  Pencil,
  Pipette,
  Slash,
} from "lucide-react";

const toolIcons: Record<ToolId, typeof Pencil> = {
  paint: Pencil,
  eraser: Eraser,
  eyedropper: Pipette,
  fill: PaintBucket,
  line: Slash,
};

export function LeftToolRail() {
  const activeTool = useActiveTool();
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  return (
    <>
      <aside
        className="flex w-20 shrink-0 flex-col gap-1 border-r border-border bg-surface p-2"
        aria-label="Tools"
      >
        {PAINT_TOOL_IDS.map((id) => {
          const Icon = toolIcons[id];
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTool(id)}
              className={cn(toolButtonVariants({ active: isActive }))}
              aria-pressed={isActive}
              aria-label={tools[id]}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-center leading-tight">{tools[id]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setDuplicateDialogOpen(true)}
          className={cn(toolButtonVariants({ active: false }))}
          aria-label={copy.frameDuplicateTitle}
        >
          <Copy className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-center leading-tight">
            {copy.frameDuplicateTitle}
          </span>
        </button>
      </aside>

      <FrameDuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
      />
    </>
  );
}
