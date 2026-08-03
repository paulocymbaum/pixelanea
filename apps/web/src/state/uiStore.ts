import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type UiState = {
  paletteCollapsed: boolean;
  showTechnicalInfo: boolean;
  apiStatus: "checking" | "connected" | "disconnected";
  apiVersion: string | null;
  onboardingDismissed: boolean;
  onboardingStep: number;
  importWizardStep: number;
  toastMessage: string | null;
  shortcutsOverlayOpen: boolean;
  onboardingOverlayVisible: boolean;
  paletteMoreToolsExpanded: boolean;
  setPaletteCollapsed: (collapsed: boolean) => void;
  setShowTechnicalInfo: (show: boolean) => void;
  setApiStatus: (status: UiState["apiStatus"], version?: string | null) => void;
  setOnboardingDismissed: (dismissed: boolean) => void;
  setOnboardingStep: (step: number) => void;
  setImportWizardStep: (step: number) => void;
  resetImportWizard: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setShortcutsOverlayOpen: (open: boolean) => void;
  setOnboardingOverlayVisible: (visible: boolean) => void;
  setPaletteMoreToolsExpanded: (expanded: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  paletteCollapsed: false,
  showTechnicalInfo: false,
  apiStatus: "checking",
  apiVersion: null,
  onboardingDismissed: false,
  onboardingStep: 0,
  importWizardStep: 0,
  toastMessage: null,
  shortcutsOverlayOpen: false,
  onboardingOverlayVisible: false,
  paletteMoreToolsExpanded: false,
  setPaletteCollapsed: (collapsed) => set({ paletteCollapsed: collapsed }),
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
  setOnboardingOverlayVisible: (visible) =>
    set({ onboardingOverlayVisible: visible }),
  setPaletteMoreToolsExpanded: (expanded) =>
    set({ paletteMoreToolsExpanded: expanded }),
}));

export const usePaletteCollapsed = () => useUiStore((s) => s.paletteCollapsed);
export const usePaletteMoreToolsExpanded = () =>
  useUiStore((s) => s.paletteMoreToolsExpanded);
export const useApiStatus = () =>
  useUiStore(
    useShallow((s) => ({ status: s.apiStatus, version: s.apiVersion })),
  );
