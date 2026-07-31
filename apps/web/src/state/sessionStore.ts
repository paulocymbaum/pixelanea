import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

type SessionState = {
  theme: ThemeMode | "system";
  palettePanelWidth: number;
  setTheme: (theme: SessionState["theme"]) => void;
  setPalettePanelWidth: (width: number) => void;
};

const STORAGE_KEY = "pixelanea-session";

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      theme: "system",
      palettePanelWidth: 240,
      setTheme: (theme) => set({ theme }),
      setPalettePanelWidth: (width) => set({ palettePanelWidth: width }),
    }),
    { name: STORAGE_KEY },
  ),
);

export function resolveTheme(theme: SessionState["theme"]): ThemeMode {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function applyThemeToDocument(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
