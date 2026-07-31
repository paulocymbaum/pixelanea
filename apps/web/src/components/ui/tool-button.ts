import { cva } from "class-variance-authority";

/** Active tool: accent bg + 3px left border + semibold — not color alone (DESIGN § Iconography). */
export const toolButtonVariants = cva(
  "flex min-h-10 min-w-10 flex-col items-center justify-center gap-1 rounded-button border-l-[3px] px-1 py-2 text-xs transition-colors",
  {
    variants: {
      active: {
        true: "border-accent bg-accent-muted font-semibold text-primary",
        false:
          "border-transparent text-secondary hover:bg-accent-muted/50",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);
