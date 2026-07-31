#include "export/path_safety.hpp"

#include "domain/result.hpp"

#include <algorithm>

namespace pixelanea::bundle {

bool is_safe_zip_entry_path(const std::string& entry_name) {
  if (entry_name.empty()) {
    return false;
  }
  if (entry_name.front() == '/' || entry_name.front() == '\\') {
    return false;
  }
  if (entry_name.find("..") != std::string::npos) {
    return false;
  }
  if (entry_name.find(':') != std::string::npos) {
    return false;
  }
  return true;
}

domain::Result<std::filesystem::path> resolve_safe_entry_path(
    const std::filesystem::path& base_dir, const std::string& entry_name) {
  if (!is_safe_zip_entry_path(entry_name)) {
    return domain::Result<std::filesystem::path>::fail("unsafe bundle entry path");
  }

  const auto resolved = std::filesystem::weakly_canonical(base_dir / entry_name);
  const auto base = std::filesystem::weakly_canonical(base_dir);
  const auto base_prefix = base.string();
  const auto resolved_prefix = resolved.string();
  if (resolved_prefix.size() < base_prefix.size() ||
      resolved_prefix.compare(0, base_prefix.size(), base_prefix) != 0) {
    return domain::Result<std::filesystem::path>::fail("bundle entry escapes target directory");
  }
  return domain::Result<std::filesystem::path>::ok(resolved);
}

}  // namespace pixelanea::bundle
