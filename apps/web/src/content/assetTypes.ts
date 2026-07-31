import type { AssetType } from "@pixelanea/api-client";

export const ASSET_TYPES: readonly AssetType[] = [
  "character",
  "prop",
  "background",
  "animation",
] as const;

export const DEFAULT_ASSET_TYPE: AssetType = "character";

export function isAssetType(value: string): value is AssetType {
  return (ASSET_TYPES as readonly string[]).includes(value);
}
