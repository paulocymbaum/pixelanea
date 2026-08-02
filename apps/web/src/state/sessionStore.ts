import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PalettePresetId } from "@/components/palette/palettePresets";
import type { ImportColorCount, ImportPaletteMode } from "@/components/import/paletteImportOptions";
import type { ResolutionPreset } from "@/components/import/resolutionPresets";
import type { AnimationFramePreset } from "@/components/project/animationFramePresets";
import type { CanvasSize } from "@/components/project/canvasSize";

export type ThemeMode = "light" | "dark";
export type EntryPath = "blank" | "import";

type SessionState = {
  theme: ThemeMode | "system";
  palettePanelWidth: number;
  lastPalettePreset: PalettePresetId | null;
  lastImportPaletteMode: ImportPaletteMode;
  lastImportColorCount: ImportColorCount;
  hasVisited: boolean;
  lastEntryPath: EntryPath;
  lastResolution: ResolutionPreset;
  lastCanvasSize: CanvasSize;
  lastFrameCount: AnimationFramePreset;
  removeBackground: boolean;
  setTheme: (theme: SessionState["theme"]) => void;
  setPalettePanelWidth: (width: number) => void;
  setLastPalettePreset: (preset: PalettePresetId | null) => void;
  setLastImportPaletteMode: (mode: ImportPaletteMode) => void;
  setLastImportColorCount: (count: ImportColorCount) => void;
  setHasVisited: (visited: boolean) => void;
  setLastEntryPath: (path: EntryPath) => void;
  setLastResolution: (resolution: ResolutionPreset) => void;
  setLastCanvasSize: (size: CanvasSize) => void;
  setLastFrameCount: (frameCount: AnimationFramePreset) => void;
  setRemoveBackground: (removeBackground: boolean) => void;
};

const STORAGE_KEY = "pixelanea-session";

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      theme: "system",
      palettePanelWidth: 240,
      lastPalettePreset: null,
      lastImportPaletteMode: "image",
      lastImportColorCount: 8,
      hasVisited: false,
      lastEntryPath: "blank",
      lastResolution: 32,
      lastCanvasSize: { width: 32, height: 32 },
      lastFrameCount: 1,
      removeBackground: true,
      setTheme: (theme) => set({ theme }),
      setPalettePanelWidth: (width) => set({ palettePanelWidth: width }),
      setLastPalettePreset: (lastPalettePreset) => set({ lastPalettePreset }),
      setLastImportPaletteMode: (lastImportPaletteMode) => set({ lastImportPaletteMode }),
      setLastImportColorCount: (lastImportColorCount) => set({ lastImportColorCount }),
      setHasVisited: (hasVisited) => set({ hasVisited }),
      setLastEntryPath: (lastEntryPath) => set({ lastEntryPath }),
      setLastResolution: (lastResolution) => set({ lastResolution }),
      setLastCanvasSize: (lastCanvasSize) => set({ lastCanvasSize }),
      setLastFrameCount: (lastFrameCount) => set({ lastFrameCount }),
      setRemoveBackground: (removeBackground) => set({ removeBackground }),
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
