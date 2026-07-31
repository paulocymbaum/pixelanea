#pragma once

#include <filesystem>
#include <httplib.h>

namespace pixelanea::api {

void register_web_static(httplib::Server& server, const std::filesystem::path& web_root);

}  // namespace pixelanea::api
