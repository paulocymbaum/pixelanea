import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type UiState = {
  paletteCollapsed: boolean;
  showTechnicalInfo: boolean;
  apiStatus: "checking" | "connected" | "disconnected";
  apiVersion: string | null;
  setPaletteCollapsed: (collapsed: boolean) => void;
  setShowTechnicalInfo: (show: boolean) => void;
  setApiStatus: (status: UiState["apiStatus"], version?: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  paletteCollapsed: false,
  showTechnicalInfo: false,
  apiStatus: "checking",
  apiVersion: null,
  setPaletteCollapsed: (collapsed) => set({ paletteCollapsed: collapsed }),
  setShowTechnicalInfo: (show) => set({ showTechnicalInfo: show }),
  setApiStatus: (status, version = null) =>
    set({ apiStatus: status, apiVersion: version }),
}));

export const usePaletteCollapsed = () => useUiStore((s) => s.paletteCollapsed);
export const useApiStatus = () =>
  useUiStore(
    useShallow((s) => ({ status: s.apiStatus, version: s.apiVersion })),
  );
