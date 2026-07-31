#pragma once

#include "domain/result.hpp"

#include <filesystem>
#include <string>

namespace pixelanea::bundle {

bool is_safe_zip_entry_path(const std::string& entry_name);
domain::Result<std::filesystem::path> resolve_safe_entry_path(
    const std::filesystem::path& base_dir, const std::string& entry_name);

}  // namespace pixelanea::bundle
