import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export type PalettePanelSection =
  | "swatches"
  | "presets"
  | "shading"
  | "filters";

type UiState = {
  paletteCollapsed: boolean;
  palettePanelSection: PalettePanelSection;
  showTechnicalInfo: boolean;
  apiStatus: "checking" | "connected" | "disconnected";
  apiVersion: string | null;
  onboardingDismissed: boolean;
  onboardingStep: number;
  importWizardStep: number;
  toastMessage: string | null;
  shortcutsOverlayOpen: boolean;
  setPaletteCollapsed: (collapsed: boolean) => void;
  setPalettePanelSection: (section: PalettePanelSection) => void;
  setShowTechnicalInfo: (show: boolean) => void;
  setApiStatus: (status: UiState["apiStatus"], version?: string | null) => void;
  setOnboardingDismissed: (dismissed: boolean) => void;
  setOnboardingStep: (step: number) => void;
  setImportWizardStep: (step: number) => void;
  resetImportWizard: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setShortcutsOverlayOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  paletteCollapsed: false,
  palettePanelSection: "swatches",
  showTechnicalInfo: false,
  apiStatus: "checking",
  apiVersion: null,
  onboardingDismissed: false,
  onboardingStep: 0,
  importWizardStep: 0,
  toastMessage: null,
  shortcutsOverlayOpen: false,
  setPaletteCollapsed: (collapsed) => set({ paletteCollapsed: collapsed }),
  setPalettePanelSection: (section) => set({ palettePanelSection: section }),
  setShowTechnicalInfo: (show) => set({ showTechnicalInfo: show }),
  setApiStatus: (status, version = null) =>
    set({ apiStatus: status, apiVersion: version }),
  setOnboardingDismissed: (dismissed) =>
    set({ onboardingDismissed: dismissed, onboardingStep: 0 }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setImportWizardStep: (step) => set({ importWizardStep: step }),
  resetImportWizard: () => set({ importWizardStep: 0 }),
  showToast: (message) => set({ toastMessage: message }),
  clearToast: () => set({ toastMessage: null }),
  setShortcutsOverlayOpen: (open) => set({ shortcutsOverlayOpen: open }),
}));

export const usePaletteCollapsed = () => useUiStore((s) => s.paletteCollapsed);
export const usePalettePanelSection = () =>
  useUiStore((s) => s.palettePanelSection);
export const useApiStatus = () =>
  useUiStore(
    useShallow((s) => ({ status: s.apiStatus, version: s.apiVersion })),
  );
