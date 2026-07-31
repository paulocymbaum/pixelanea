#include "export/manifest.hpp"

#include "export/sha256.hpp"

#include <filesystem>
#include <nlohmann/json.hpp>

namespace pixelanea::bundle {

namespace {

std::string checksum_for_file(const std::filesystem::path& path) {
  const std::string hex = sha256_hex_file(path);
  if (hex.empty()) {
    return {};
  }
  return "sha256:" + hex;
}

}  // namespace

BundleManifest manifest_from_project(const domain::Project& project) {
  BundleManifest manifest;
  manifest.project_id = project.id.value;
  manifest.project_name = project.name;
  manifest.asset_type = project.asset_type;
  manifest.created_at = project.created_at;
  manifest.updated_at = project.updated_at;
  return manifest;
}

domain::Result<BundleManifest> parse_manifest_json(const std::string& json_text) {
  try {
    const auto json = nlohmann::json::parse(json_text);
    BundleManifest manifest;
    manifest.project_id = json.at("projectId").get<std::string>();
    manifest.project_name = json.at("projectName").get<std::string>();
    manifest.created_at = json.at("createdAt").get<std::string>();
    manifest.updated_at = json.at("updatedAt").get<std::string>();
    if (json.contains("assetType")) {
      const auto parsed =
          domain::asset_type_from_string(json.at("assetType").get<std::string>());
      if (parsed) {
        manifest.asset_type = *parsed;
      }
    }

    const auto format = json.at("format").get<std::string>();
    if (format != kBundleFormat) {
      return domain::Result<BundleManifest>::fail("unsupported bundle format");
    }
    const int format_version = json.at("formatVersion").get<int>();
    if (format_version != kBundleFormatVersion) {
      return domain::Result<BundleManifest>::fail("unsupported bundle version");
    }

    for (const auto& [path, checksum] : json.at("checksums").items()) {
      manifest.checksums[path] = checksum.get<std::string>();
    }
    return domain::Result<BundleManifest>::ok(std::move(manifest));
  } catch (const nlohmann::json::exception&) {
    return domain::Result<BundleManifest>::fail("invalid bundle manifest");
  }
}

std::string serialize_manifest_json(const BundleManifest& manifest) {
  nlohmann::json checksums = nlohmann::json::object();
  for (const auto& [path, checksum] : manifest.checksums) {
    checksums[path] = checksum;
  }

  const nlohmann::json json{{"format", kBundleFormat},
                            {"formatVersion", kBundleFormatVersion},
                            {"appMinVersion", kAppMinVersion},
                            {"projectId", manifest.project_id},
                            {"projectName", manifest.project_name},
                            {"assetType", domain::asset_type_to_string(manifest.asset_type)},
                            {"createdAt", manifest.created_at},
                            {"updatedAt", manifest.updated_at},
                            {"checksums", checksums}};
  return json.dump(2);
}

domain::VoidResult validate_manifest(const BundleManifest& manifest) {
  if (manifest.project_id.empty() || manifest.project_name.empty()) {
    return domain::VoidResult::fail("bundle manifest is missing project metadata");
  }
  if (manifest.checksums.find(kDbEntryName) == manifest.checksums.end()) {
    return domain::VoidResult::fail("bundle manifest is missing project.db checksum");
  }
  for (const auto& [path, checksum] : manifest.checksums) {
    if (path.empty() || path.find("..") != std::string::npos || path.front() == '/') {
      return domain::VoidResult::fail("bundle manifest contains unsafe file path");
    }
    if (checksum.rfind("sha256:", 0) != 0 || checksum.size() != 7 + 64) {
      return domain::VoidResult::fail("bundle manifest has invalid checksum");
    }
  }
  return domain::VoidResult::ok();
}

domain::VoidResult verify_checksums(const std::filesystem::path& base_dir,
                                      const BundleManifest& manifest) {
  for (const auto& [relative_path, expected] : manifest.checksums) {
    const auto file_path = base_dir / relative_path;
    if (!std::filesystem::is_regular_file(file_path)) {
      return domain::VoidResult::fail("bundle file is missing or corrupted: " + relative_path);
    }
    const std::string actual = checksum_for_file(file_path);
    if (actual.empty()) {
      return domain::VoidResult::fail("could not verify bundle file: " + relative_path);
    }
    if (actual != expected) {
      return domain::VoidResult::fail("bundle checksum mismatch: " + relative_path);
    }
  }
  return domain::VoidResult::ok();
}

}  // namespace pixelanea::bundle
