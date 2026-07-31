import { toolButtonVariants } from "@/components/ui/tool-button";
import { tools, type ToolId } from "@/content/tools";
import { cn } from "@/lib/cn";
import { useActiveTool, useEditorStore } from "@/state/editorStore";
import { Eraser, ImagePlus, Pencil, Pipette, Copy } from "lucide-react";

const toolIcons: Record<ToolId, typeof Pencil> = {
  paint: Pencil,
  eraser: Eraser,
  eyedropper: Pipette,
  import: ImagePlus,
  frameDuplicate: Copy,
};

export function LeftToolRail() {
  const activeTool = useActiveTool();
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const toolIds = Object.keys(tools) as ToolId[];

  return (
    <aside
      className="flex w-20 shrink-0 flex-col gap-1 border-r border-border bg-surface p-2"
      aria-label="Tools"
    >
      {toolIds.map((id) => {
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
    </aside>
  );
}
