import { copy } from "@/content/copy";
import { useFrameCount } from "@/state/editorStore";

export function BottomFrameStrip() {
  const frameCount = useFrameCount();

  // Progressive disclosure: hidden when single frame (UX.md / skill)
  if (frameCount <= 1) {
    return null;
  }

  return (
    <div
      className="flex h-14 shrink-0 items-center gap-3 border-t border-border bg-surface px-4"
      aria-label="Frame strip"
    >
      <span className="text-sm text-secondary">{copy.frameStripPlaceholder}</span>
      <div className="flex gap-2">
        {Array.from({ length: frameCount }, (_, i) => (
          <div
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded-swatch border border-border bg-elevated font-mono text-sm text-secondary"
          >
            {i + 1}
          </div>
        ))}
      </div>
      <span className="text-sm text-secondary">▶ 8 fps · loop</span>
    </div>
  );
}
