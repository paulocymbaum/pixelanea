import { copy } from "@/content/copy";

export type PalettePresetId =
  | "retro"
  | "gameboy"
  | "monochrome"
  | "nes"
  | "pico8"
  | "pastel";

export type PalettePreset = {
  id: PalettePresetId;
  colors: readonly string[];
};

const PALETTE_PRESET_LABELS: Record<PalettePresetId, string> = {
  retro: copy.palettePresetRetro,
  gameboy: copy.palettePresetGameboy,
  monochrome: copy.palettePresetMonochrome,
  nes: copy.palettePresetNes,
  pico8: copy.palettePresetPico8,
  pastel: copy.palettePresetPastel,
};

/** User-facing label for a palette preset button (shared by grid + QA harness). */
export function palettePresetLabel(id: PalettePresetId): string {
  return PALETTE_PRESET_LABELS[id];
}

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
  {
    id: "nes",
    colors: [
      "#000000",
      "#FCFCFC",
      "#F83800",
      "#D82800",
      "#FC9838",
      "#00A800",
      "#0078F8",
      "#0058F8",
    ],
  },
  {
    id: "pico8",
    colors: [
      "#000000",
      "#1D2B53",
      "#7E2553",
      "#008751",
      "#AB5236",
      "#5F574F",
      "#C2C3C7",
      "#FFF1E8",
    ],
  },
  {
    id: "pastel",
    colors: [
      "#2D2A32",
      "#FFF5E1",
      "#FFC9DE",
      "#B8E0D2",
      "#A8D8EA",
      "#D4A5FF",
      "#FFD6A5",
      "#FFADAD",
    ],
  },
] as const;

export function getPalettePreset(id: PalettePresetId): PalettePreset | undefined {
  return PALETTE_PRESETS.find((preset) => preset.id === id);
}

/** Curated quick-access presets for the Swatches tab chip row (Casey shortcut). */
export const QUICK_PALETTE_PRESET_IDS: readonly PalettePresetId[] = [
  "retro",
  "gameboy",
  "monochrome",
  "nes",
] as const;

const QUICK_PRESET_LIMIT = 4;

/**
 * Presets shown on the Swatches tab: last-used first (when set), then curated ids.
 */
export function getQuickPalettePresets(
  lastPreset: PalettePresetId | null,
): readonly PalettePreset[] {
  const seen = new Set<PalettePresetId>();
  const result: PalettePreset[] = [];

  const add = (id: PalettePresetId) => {
    if (seen.has(id)) return;
    const preset = getPalettePreset(id);
    if (!preset) return;
    seen.add(id);
    result.push(preset);
  };

  if (lastPreset) {
    add(lastPreset);
  }
  for (const id of QUICK_PALETTE_PRESET_IDS) {
    if (result.length >= QUICK_PRESET_LIMIT) break;
    add(id);
  }

  return result;
}
