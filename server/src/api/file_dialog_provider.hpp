#pragma once

#include <filesystem>
#include <optional>
#include <string>

namespace pixelanea::api {

enum class FileDialogMode { Open, SaveAs };

struct PickPathRequest {
  FileDialogMode mode = FileDialogMode::Open;
  std::optional<std::filesystem::path> default_path;
  std::optional<std::string> default_name;
};

struct PickPathResult {
  bool cancelled = false;
  std::filesystem::path path;
  std::string error_message;
};

class FileDialogProvider {
 public:
  virtual ~FileDialogProvider() = default;
  virtual PickPathResult pick_path(const PickPathRequest& request) = 0;
};

/** Maximum seconds the server waits for a synchronous zenity dialog. */
inline constexpr int kZenityMaxWaitSeconds = 300;

constexpr const char* kPixelaneaExtension = ".pixelanea";

bool has_pixelanea_extension(const std::filesystem::path& path);
std::filesystem::path ensure_pixelanea_extension(std::filesystem::path path);

}  // namespace pixelanea::api
