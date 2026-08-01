import { Button } from "@/components/ui";
import { copy } from "@/content/copy";
import {
  applyThemeToDocument,
  resolveTheme,
  useSessionStore,
  type ThemeMode,
} from "@/state/sessionStore";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const theme = useSessionStore((s) => s.theme);
  const setTheme = useSessionStore((s) => s.setTheme);

  const cycleTheme = () => {
    const resolved = resolveTheme(theme);
    const next: ThemeMode = resolved === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeToDocument(next);
  };

  const resolved = resolveTheme(theme);
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <Button
      type="button"
      variant="ghost"
      className="gap-2 px-3"
      onClick={cycleTheme}
      aria-label={copy.themeToggleAriaLabel}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
      <span className="hidden lg:inline">{copy.themeToggleLabel}</span>
    </Button>
  );
}
