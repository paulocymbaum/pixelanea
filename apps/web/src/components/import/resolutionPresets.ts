export type ResolutionPreset = 16 | 32 | 64 | 128 | 256;

export type ResolutionOption = {
  size: ResolutionPreset;
  label: string;
  description: string;
};

export const RESOLUTION_PRESETS: readonly ResolutionOption[] = [
  { size: 16, label: "Icon", description: "16×16" },
  { size: 32, label: "Sprite", description: "32×32" },
  { size: 64, label: "Detail", description: "64×64" },
  { size: 128, label: "Large sprite", description: "128×128" },
  { size: 256, label: "Tile", description: "256×256" },
] as const;

export function getResolutionOption(
  size: ResolutionPreset,
): ResolutionOption | undefined {
  return RESOLUTION_PRESETS.find((option) => option.size === size);
}
