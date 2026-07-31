#pragma once

#include "domain/result.hpp"
#include "domain/types.hpp"

#include <filesystem>
#include <map>
#include <string>

namespace pixelanea::bundle {

inline constexpr const char* kBundleFormat = "pixelanea-bundle";
inline constexpr int kBundleFormatVersion = 1;
inline constexpr const char* kAppMinVersion = "1.0.0";
inline constexpr const char* kDbEntryName = "project.db";
inline constexpr const char* kManifestEntryName = "manifest.json";

struct BundleManifest {
  std::string project_id;
  std::string project_name;
  domain::AssetType asset_type = domain::kDefaultAssetType;
  std::string created_at;
  std::string updated_at;
  std::map<std::string, std::string> checksums;
};

BundleManifest manifest_from_project(const domain::Project& project);
domain::Result<BundleManifest> parse_manifest_json(const std::string& json_text);
std::string serialize_manifest_json(const BundleManifest& manifest);
domain::VoidResult validate_manifest(const BundleManifest& manifest);
domain::VoidResult verify_checksums(const std::filesystem::path& base_dir,
                                      const BundleManifest& manifest);

}  // namespace pixelanea::bundle
