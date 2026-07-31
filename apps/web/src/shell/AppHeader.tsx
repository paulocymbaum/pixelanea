import { copy } from "@/content/copy";
import { useProjectName } from "@/state/editorStore";
import {
  applyThemeToDocument,
  resolveTheme,
  useSessionStore,
  type ThemeMode,
} from "@/state/sessionStore";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Moon, Sun } from "lucide-react";

function ThemeToggle() {
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
      size="icon"
      onClick={cycleTheme}
      aria-label="Toggle theme"
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
    </Button>
  );
}

export function AppHeader() {
  const projectName = useProjectName();

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-surface px-4"
      role="banner"
    >
      <div className="flex items-center gap-2">
        <img
          src="/logo-glyph.svg"
          alt=""
          className="h-6 w-6"
          width={24}
          height={24}
        />
        <span className="text-md font-semibold text-primary">{copy.appName}</span>
      </div>

      <nav className="flex items-center gap-1" aria-label="Main menu">
        <MenuDropdown label="File" items={["New", "Open", "Save"]} />
        <MenuDropdown label="Edit" items={["Undo", "Redo"]} />
        <MenuDropdown label="View" items={["Zoom in", "Zoom out", "Fit"]} />
      </nav>

      <div className="flex-1 text-center text-md text-primary">{projectName}</div>

      <ThemeToggle />
    </header>
  );
}

function MenuDropdown({ label, items }: { label: string; items: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="text-base">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map((item) => (
          <DropdownMenuItem key={item} disabled>
            {item}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
