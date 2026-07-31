import { Canvas } from "@/canvas/Canvas";
import { UndoRedoToolbar } from "@/components/toolbar/UndoRedoToolbar";
import { BottomFrameStrip } from "./BottomFrameStrip";
import { LeftToolRail } from "./LeftToolRail";
import { RightPalettePanel } from "./RightPalettePanel";
import { StatusBar } from "./StatusBar";

export function EditorLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <LeftToolRail />

        {/* Canvas column: min 60% viewport width per DESIGN.md */}
        <main
          className="flex min-w-[60vw] flex-1 flex-col gap-2 p-2"
          aria-label="Canvas workspace"
        >
          <UndoRedoToolbar />
          <Canvas />
        </main>

        <RightPalettePanel />
      </div>

      <BottomFrameStrip />
      <StatusBar />
    </div>
  );
}
