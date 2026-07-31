export type PalettePresetId = "retro" | "gameboy" | "monochrome";

export type PalettePreset = {
  id: PalettePresetId;
  colors: readonly string[];
};

/** Curated presets per UX.md / DESIGN.md — applied via PUT /palette. */
export const PALETTE_PRESETS: readonly PalettePreset[] = [
  {
    id: "retro",
    colors: [
      "#000000",
      "#FCFCFC",
      "#F8B800",
      "#C84C0C",
      "#503000",
      "#00A800",
      "#0058F8",
      "#6844FC",
    ],
  },
  {
    id: "gameboy",
    colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
  },
  {
    id: "monochrome",
    colors: ["#000000", "#545454", "#A8A8A8", "#FCFCFC"],
  },
] as const;

export function getPalettePreset(id: PalettePresetId): PalettePreset | undefined {
  return PALETTE_PRESETS.find((preset) => preset.id === id);
}
