import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import type { SelectionRect } from "@/canvas/selectionGeometry";
import { copy } from "@/content/copy";
import type { MovePreview } from "@/state/editorStoreMove";
import type { PastePreview } from "@/state/editorStorePaste";
import { useEditorStore } from "@/state/editorStore";
import { useViewportStore } from "@/state/viewportStore";
import { useUiStore } from "@/state/uiStore";
import {
  ArrowRightLeft,
  Check,
  ClipboardCopy,
  ClipboardPaste,
  CopyPlus,
  Scissors,
  X,
} from "lucide-react";

const BAR_GAP_PX = 8;
const BAR_ESTIMATED_HEIGHT_PX = 44;
const FRAME_STRIP_RESERVE_PX = 56;

type SelectionActionBarProps = {
  selection: SelectionRect;
};

function barPosition(
  selection: SelectionRect,
  zoom: number,
  panX: number,
  panY: number,
  _containerWidth: number,
  containerHeight: number,
): { left: number; top: number } {
  const cellSize = zoom;
  const bboxLeft = panX + selection.x * cellSize;
  const bboxTop = panY + selection.y * cellSize;
  const bboxWidth = selection.width * cellSize;
  const bboxHeight = selection.height * cellSize;

  const centerX = bboxLeft + bboxWidth / 2;
  let top = bboxTop + bboxHeight + BAR_GAP_PX;

  const nearBottom =
    top + BAR_ESTIMATED_HEIGHT_PX >
    containerHeight - FRAME_STRIP_RESERVE_PX;
  if (nearBottom) {
    top = bboxTop - BAR_GAP_PX - BAR_ESTIMATED_HEIGHT_PX;
  }

  return { left: centerX, top };
}

export function SelectionActionBar({ selection }: SelectionActionBarProps) {
  const zoom = useViewportStore((s) => s.zoom);
  const panX = useViewportStore((s) => s.panX);
  const panY = useViewportStore((s) => s.panY);
  const containerSize = useViewportStore((s) => s.containerSize);

  const readOnly = useEditorStore((s) => s.readOnly);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const clipboard = useEditorStore((s) => s.clipboard);
  const pastePreview = useEditorStore((s) => s.pastePreview);
  const movePreview = useEditorStore((s) => s.movePreview);
  const hasSelection = useEditorStore((s) => s.selection) !== null;
  const selectionMoving = useEditorStore((s) => s.selectionMoving);
  const showTechnicalInfo = useUiStore((s) => s.showTechnicalInfo);
  const copySelection = useEditorStore((s) => s.copySelection);
  const cutSelection = useEditorStore((s) => s.cutSelection);
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection);
  const startPastePreview = useEditorStore((s) => s.startPastePreview);
  const commitPaste = useEditorStore((s) => s.commitPaste);
  const cancelPaste = useEditorStore((s) => s.cancelPaste);
  const startMovePreview = useEditorStore((s) => s.startMovePreview);
  const commitMove = useEditorStore((s) => s.commitMove);
  const cancelMove = useEditorStore((s) => s.cancelMove);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  if (readOnly || isPlaying) {
    return null;
  }

  const { left, top } = barPosition(
    selection,
    zoom,
    panX,
    panY,
    containerSize.width,
    containerSize.height,
  );

  const placementMode = pastePreview ?? movePreview;

  const handleCopy = () => {
    void copySelection();
  };

  const handleCut = () => {
    void cutSelection();
  };

  const handleDuplicate = () => {
    void duplicateSelection();
  };

  const handlePlace = async () => {
    if (pastePreview) {
      await commitPaste();
    } else if (movePreview) {
      await commitMove();
    }
  };

  const handleCancelPlacement = () => {
    if (pastePreview) {
      cancelPaste();
    } else if (movePreview) {
      cancelMove();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="pointer-events-auto absolute z-10 -translate-x-1/2"
        style={{ left, top }}
        role="toolbar"
        aria-label={copy.selectionActionBarLabel}
      >
        <div
          className="flex min-w-[160px] items-center gap-1 rounded-panel border border-border bg-elevated/95 p-1 shadow-sm"
        >
          {placementMode ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handlePlace()}
                    disabled={selectionMoving}
                    aria-busy={selectionMoving}
                    aria-label={copy.selectionPlace}
                    className={selectionMoving ? "opacity-50" : undefined}
                  >
                    <Check className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.shortcutPasteCommit}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelPlacement}
                    aria-label={copy.selectionCancel}
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.shortcutPasteCancel}</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => startMovePreview()}
                    aria-label={copy.selectionMove}
                  >
                    <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.selectionMoveHint}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleCopy()}
                    disabled={selectionMoving}
                    aria-label={copy.shortcutCopy}
                  >
                    <ClipboardCopy className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.shortcutCopy}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleDuplicate}
                    disabled={selectionMoving}
                    aria-label={copy.selectionDuplicate}
                  >
                    <CopyPlus className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.selectionDuplicateHint}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleCut()}
                    disabled={selectionMoving}
                    aria-label={copy.shortcutCut}
                  >
                    <Scissors className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.shortcutCut}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => startPastePreview()}
                    disabled={!clipboard || selectionMoving}
                    aria-label={copy.shortcutPaste}
                  >
                    <ClipboardPaste className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {clipboard ? copy.shortcutPaste : copy.clipboardEmptyPaste}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => clearSelection()}
                    aria-label={copy.selectionDeselect}
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copy.selectionDeselect}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
        {placementMode ? (
          <p className="mt-1 text-center text-xs text-secondary">
            {movePreview
              ? copy.moveModeHint
              : pastePreview && !hasSelection
                ? copy.cutPasteBadge
                : copy.pasteModeHint}
          </p>
        ) : showTechnicalInfo ? (
          <p className="mt-1 text-center font-mono text-xs text-secondary">
            {copy.selectionSizeReadout(selection.width, selection.height)}
          </p>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

export function selectionActionBarAnchor(
  selection: SelectionRect | null,
  pastePreview: PastePreview | null,
  movePreview: MovePreview | null,
): SelectionRect | null {
  if (selection) {
    return selection;
  }

  if (movePreview) {
    return {
      x: movePreview.originX,
      y: movePreview.originY,
      width: movePreview.clipboard.width,
      height: movePreview.clipboard.height,
      shape: "rect",
    };
  }

  if (pastePreview) {
    return {
      x: pastePreview.originX,
      y: pastePreview.originY,
      width: pastePreview.clipboard.width,
      height: pastePreview.clipboard.height,
      shape: "rect",
    };
  }

  return null;
}

export function selectionActionBarPosition(
  selection: SelectionRect,
  zoom: number,
  panX: number,
  panY: number,
  containerWidth: number,
  containerHeight: number,
): { left: number; top: number } {
  return barPosition(
    selection,
    zoom,
    panX,
    panY,
    containerWidth,
    containerHeight,
  );
}
