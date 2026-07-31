#pragma once

#include "domain/result.hpp"
#include "domain/types.hpp"
#include "export/manifest.hpp"

#include <filesystem>

namespace pixelanea::bundle {

struct PackBundleParams {
  std::filesystem::path db_path;
  domain::Project project;
};

struct UnpackBundleResult {
  std::filesystem::path extract_dir;
  std::filesystem::path db_path;
  BundleManifest manifest;
};

domain::VoidResult pack_bundle(const PackBundleParams& params,
                                 const std::filesystem::path& output_path);
domain::Result<UnpackBundleResult> unpack_bundle(const std::filesystem::path& bundle_path,
                                                   const std::filesystem::path& extract_dir);

}  // namespace pixelanea::bundle
