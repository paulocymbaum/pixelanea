#pragma once

#include "api/file_dialog_provider.hpp"
#include "logging/logger.hpp"

#include <httplib.h>
#include <nlohmann/json.hpp>

namespace pixelanea::api {

httplib::Response handle_pick_project_path(const nlohmann::json& body, FileDialogProvider& provider,
                                           const logging::ScopedLogger& log);

}  // namespace pixelanea::api
