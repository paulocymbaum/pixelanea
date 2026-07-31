import { useState } from "react";
import { FrameDuplicateDialog } from "@/components/frames/FrameDuplicateDialog";
import { toolButtonVariants } from "@/components/ui/tool-button";
import { tools, type ToolId } from "@/content/tools";
import { cn } from "@/lib/cn";
import { useActiveTool, useEditorStore } from "@/state/editorStore";
import {
  Copy,
  Eraser,
  ImagePlus,
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
  import: ImagePlus,
  frameDuplicate: Copy,
};

const CHROME_TOOLS: ToolId[] = ["import", "frameDuplicate"];

export function LeftToolRail() {
  const activeTool = useActiveTool();
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  const toolIds = Object.keys(tools) as ToolId[];

  const handleToolClick = (id: ToolId) => {
    if (id === "frameDuplicate") {
      setDuplicateDialogOpen(true);
      return;
    }
    setActiveTool(id);
  };

  return (
    <>
      <aside
        className="flex w-20 shrink-0 flex-col gap-1 border-r border-border bg-surface p-2"
        aria-label="Tools"
      >
        {toolIds.map((id) => {
          const Icon = toolIcons[id];
          const isChromeTool = CHROME_TOOLS.includes(id);
          const isActive = isChromeTool ? false : activeTool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleToolClick(id)}
              className={cn(toolButtonVariants({ active: isActive }))}
              aria-pressed={isActive}
              aria-label={tools[id]}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-center leading-tight">{tools[id]}</span>
            </button>
          );
        })}
      </aside>

      <FrameDuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
      />
    </>
  );
}
