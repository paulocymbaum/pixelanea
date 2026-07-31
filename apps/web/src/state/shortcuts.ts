import { useEffect } from "react";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import type { ToolId } from "@/content/tools";

const TOOL_SHORTCUTS: Record<string, ToolId> = {
  b: "paint",
  e: "eraser",
  i: "eyedropper",
  g: "fill",
  l: "line",
};

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

export function useEditorShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setActiveColorIndex = useEditorStore((s) => s.setActiveColorIndex);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const paletteLength = useEditorStore((s) => s.paletteColors.length);
  const setShortcutsOverlayOpen = useUiStore((s) => s.setShortcutsOverlayOpen);
  const shortcutsOverlayOpen = useUiStore((s) => s.shortcutsOverlayOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "Escape" && shortcutsOverlayOpen) {
        event.preventDefault();
        setShortcutsOverlayOpen(false);
        return;
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

      const digit = Number.parseInt(event.key, 10);
      if (digit >= 1 && digit <= 9 && digit <= paletteLength) {
        setActiveColorIndex(digit - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    undo,
    redo,
    setActiveColorIndex,
    setActiveTool,
    paletteLength,
    setShortcutsOverlayOpen,
    shortcutsOverlayOpen,
  ]);
}
