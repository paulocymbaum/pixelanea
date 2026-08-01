#include "api/file_dialog_handlers.hpp"

#include "api/http_response.hpp"

#include <cctype>

namespace pixelanea::api {

namespace {

bool to_lower_equals(std::string_view value, std::string_view expected) {
  if (value.size() != expected.size()) {
    return false;
  }
  for (std::size_t index = 0; index < value.size(); ++index) {
    if (std::tolower(static_cast<unsigned char>(value[index])) !=
        std::tolower(static_cast<unsigned char>(expected[index]))) {
      return false;
    }
  }
  return true;
}

}  // namespace

bool has_pixelanea_extension(const std::filesystem::path& path) {
  return to_lower_equals(path.extension().string(), kPixelaneaExtension);
}

std::filesystem::path ensure_pixelanea_extension(std::filesystem::path path) {
  if (!has_pixelanea_extension(path)) {
    path += kPixelaneaExtension;
  }
  return path;
}

namespace {

httplib::Response respond_dialog_error(const logging::ScopedLogger& log, int status,
                                       std::string_view event, const std::string& message) {
  if (status >= 500) {
    log.error(event, {{"status", status}, {"error", message}});
  } else {
    log.warn(event, {{"status", status}, {"error", message}});
  }
  return error_response(status, message);
}

}  // namespace

httplib::Response handle_pick_project_path(const nlohmann::json& body, FileDialogProvider& provider,
                                           const logging::ScopedLogger& log) {
  if (!body.contains("mode")) {
    return respond_dialog_error(log, 400, "dialog.missing_mode", "mode is required");
  }

  const std::string mode = body.at("mode").get<std::string>();
  PickPathRequest request;
  if (mode == "open") {
    request.mode = FileDialogMode::Open;
  } else if (mode == "saveAs") {
    request.mode = FileDialogMode::SaveAs;
  } else {
    return respond_dialog_error(log, 400, "dialog.invalid_mode",
                                "mode must be open or saveAs");
  }

  if (body.contains("defaultPath") && !body.at("defaultPath").is_null()) {
    const auto path = body.at("defaultPath").get<std::string>();
    if (!path.empty()) {
      request.default_path = std::filesystem::path(path);
    }
  }

  if (body.contains("defaultName") && !body.at("defaultName").is_null()) {
    const auto name = body.at("defaultName").get<std::string>();
    if (!name.empty()) {
      request.default_name = name;
    }
  }

  const auto result = provider.pick_path(request);
  if (!result.error_message.empty()) {
    if (result.error_message == "zenity is not installed") {
      return respond_dialog_error(log, 503, "dialog.unavailable", result.error_message);
    }
    if (result.error_message == "file dialog timed out") {
      return respond_dialog_error(log, 504, "dialog.timeout", result.error_message);
    }
    return respond_dialog_error(log, 400, "dialog.failed", result.error_message);
  }

  if (result.cancelled) {
    return json_response(200, nlohmann::json{{"cancelled", true}});
  }

  return json_response(200, nlohmann::json{{"path", result.path.string()}});
}

}  // namespace pixelanea::api
