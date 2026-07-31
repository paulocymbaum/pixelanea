import { useEffect } from "react";
import { useEditorStore } from "@/state/editorStore";

export function useEditorShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setActiveColorIndex = useEditorStore((s) => s.setActiveColorIndex);
  const paletteLength = useEditorStore((s) => s.paletteColors.length);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;

      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (mod && (key === "z" && event.shiftKey || key === "y")) {
        event.preventDefault();
        redo();
        return;
      }

      const digit = Number.parseInt(event.key, 10);
      if (digit >= 1 && digit <= 9 && digit <= paletteLength) {
        setActiveColorIndex(digit - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, setActiveColorIndex, paletteLength]);
}
