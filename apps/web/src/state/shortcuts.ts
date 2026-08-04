import { useEffect } from "react";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import {
  type PalettePanelSection,
  useSessionStore,
} from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import { useViewportStore } from "@/state/viewportStore";
import type { ToolId } from "@/tools/registry";

const TOOL_SHORTCUTS: Record<string, ToolId> = {
  b: "paint",
  e: "eraser",
  i: "eyedropper",
  g: "fill",
  l: "line",
  m: "select",
  h: "hand",
};

export const PALETTE_SECTION_ALT_KEYS: Record<number, PalettePanelSection> = {
  1: "swatches",
  2: "presets",
  3: "shading",
  4: "filters",
};

export const PALETTE_SECTION_ORDER: PalettePanelSection[] = [
  "swatches",
  "presets",
  "shading",
  "filters",
];

export function getPaletteSectionFromAltDigit(
  digit: number,
): PalettePanelSection | undefined {
  return PALETTE_SECTION_ALT_KEYS[digit];
}

export function cyclePalettePanelSection(
  current: PalettePanelSection,
  direction: "next" | "prev",
): PalettePanelSection {
  const index = PALETTE_SECTION_ORDER.indexOf(current);
  const offset = direction === "next" ? 1 : -1;
  const nextIndex =
    (index + offset + PALETTE_SECTION_ORDER.length) %
    PALETTE_SECTION_ORDER.length;
  return PALETTE_SECTION_ORDER[nextIndex]!;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
}

function expandPaletteMoreToolsIfNeeded(section: PalettePanelSection) {
  if (section === "shading" || section === "filters") {
    useUiStore.getState().setPaletteMoreToolsExpanded(true);
  }
}

export function useEditorShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const copySelection = useEditorStore((s) => s.copySelection);
  const cutSelection = useEditorStore((s) => s.cutSelection);
  const startPastePreview = useEditorStore((s) => s.startPastePreview);
  const commitPaste = useEditorStore((s) => s.commitPaste);
  const cancelPaste = useEditorStore((s) => s.cancelPaste);
  const nudgePastePreview = useEditorStore((s) => s.nudgePastePreview);
  const commitMove = useEditorStore((s) => s.commitMove);
  const cancelMove = useEditorStore((s) => s.cancelMove);
  const nudgeMovePreview = useEditorStore((s) => s.nudgeMovePreview);
  const nudgeSelection = useEditorStore((s) => s.nudgeSelection);
  const setActiveColorIndex = useEditorStore((s) => s.setActiveColorIndex);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const paletteLength = useEditorStore((s) => s.paletteColors.length);
  const showToast = useUiStore((s) => s.showToast);
  const setPalettePanelSection = useSessionStore(
    (s) => s.setPalettePanelSection,
  );
  const setPaletteCollapsed = useUiStore((s) => s.setPaletteCollapsed);
  const setShortcutsOverlayOpen = useUiStore((s) => s.setShortcutsOverlayOpen);
  const shortcutsOverlayOpen = useUiStore((s) => s.shortcutsOverlayOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        const state = useEditorStore.getState();
        if (state.pastePreview) {
          event.preventDefault();
          cancelPaste();
          return;
        }
        if (state.movePreview) {
          event.preventDefault();
          cancelMove();
          return;
        }

        if (shortcutsOverlayOpen) {
          event.preventDefault();
          setShortcutsOverlayOpen(false);
          return;
        }
      }

      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        setShortcutsOverlayOpen(!shortcutsOverlayOpen);
        return;
      }

      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (mod && key === "c") {
        event.preventDefault();
        void copySelection().then((ok) => {
          if (ok) {
            showToast(copy.selectionCopied);
          }
        });
        return;
      }

      if (mod && key === "x") {
        event.preventDefault();
        void cutSelection().then((ok) => {
          if (ok) {
            showToast(copy.selectionCut);
          }
        });
        return;
      }

      if (mod && key === "v") {
        event.preventDefault();
        startPastePreview();
        return;
      }

      const placementState = useEditorStore.getState();
      if (event.key === "Enter" && placementState.pastePreview) {
        event.preventDefault();
        void commitPaste();
        return;
      }
      if (event.key === "Enter" && placementState.movePreview) {
        event.preventDefault();
        void commitMove();
        return;
      }

      if (placementState.pastePreview && !mod && !event.altKey) {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            nudgePastePreview(0, -1);
            return;
          case "ArrowDown":
            event.preventDefault();
            nudgePastePreview(0, 1);
            return;
          case "ArrowLeft":
            event.preventDefault();
            nudgePastePreview(-1, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            nudgePastePreview(1, 0);
            return;
        }
      }

      if (placementState.movePreview && !mod && !event.altKey) {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            nudgeMovePreview(0, -1);
            return;
          case "ArrowDown":
            event.preventDefault();
            nudgeMovePreview(0, 1);
            return;
          case "ArrowLeft":
            event.preventDefault();
            nudgeMovePreview(-1, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            nudgeMovePreview(1, 0);
            return;
        }
      }

      if (
        placementState.selection &&
        !placementState.pastePreview &&
        !placementState.movePreview &&
        !mod &&
        !event.altKey
      ) {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            nudgeSelection(0, -1);
            return;
          case "ArrowDown":
            event.preventDefault();
            nudgeSelection(0, 1);
            return;
          case "ArrowLeft":
            event.preventDefault();
            nudgeSelection(-1, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            nudgeSelection(1, 0);
            return;
        }
      }

      if (mod && ((key === "z" && event.shiftKey) || key === "y")) {
        event.preventDefault();
        redo();
        return;
      }

      const toolId = TOOL_SHORTCUTS[key];
      if (toolId && !mod && !event.altKey) {
        event.preventDefault();
        setActiveTool(toolId);
        return;
      }

      if (!mod && !event.altKey && !event.shiftKey) {
        const { gridWidth, gridHeight } = useEditorStore.getState();
        const containerSize = useViewportStore.getState().containerSize;
        const anchor = {
          x: containerSize.width / 2,
          y: containerSize.height / 2,
        };

        if (event.key === "=" || event.key === "+") {
          event.preventDefault();
          useViewportStore.getState().zoomIn(anchor);
          return;
        }
        if (event.key === "-") {
          event.preventDefault();
          useViewportStore.getState().zoomOut(anchor);
          return;
        }
        if (event.key === "0") {
          event.preventDefault();
          useViewportStore.getState().fitToView(undefined, gridWidth, gridHeight);
          return;
        }
      }

      if (event.altKey && !mod) {
        const digit = Number.parseInt(event.key, 10);
        const section = getPaletteSectionFromAltDigit(digit);
        if (section) {
          event.preventDefault();
          expandPaletteMoreToolsIfNeeded(section);
          setPalettePanelSection(section);
          setPaletteCollapsed(false);
          return;
        }
      }

      if (!mod && !event.altKey && !event.shiftKey) {
        if (event.key === "]") {
          event.preventDefault();
          const current = useSessionStore.getState().palettePanelSection;
          const next = cyclePalettePanelSection(current, "next");
          expandPaletteMoreToolsIfNeeded(next);
          setPalettePanelSection(next);
          setPaletteCollapsed(false);
          return;
        }
        if (event.key === "[") {
          event.preventDefault();
          const current = useSessionStore.getState().palettePanelSection;
          const prev = cyclePalettePanelSection(current, "prev");
          expandPaletteMoreToolsIfNeeded(prev);
          setPalettePanelSection(prev);
          setPaletteCollapsed(false);
          return;
        }
      }

      const digit = Number.parseInt(event.key, 10);
      if (
        !event.altKey &&
        digit >= 1 &&
        digit <= 9 &&
        digit <= paletteLength
      ) {
        setActiveColorIndex(digit - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    undo,
    redo,
    copySelection,
    cutSelection,
    startPastePreview,
    commitPaste,
    cancelPaste,
    nudgePastePreview,
    commitMove,
    cancelMove,
    nudgeMovePreview,
    nudgeSelection,
    showToast,
    setActiveColorIndex,
    setActiveTool,
    paletteLength,
    setPalettePanelSection,
    setPaletteCollapsed,
    setShortcutsOverlayOpen,
    shortcutsOverlayOpen,
  ]);
}
