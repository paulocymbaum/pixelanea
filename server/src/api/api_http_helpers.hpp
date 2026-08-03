#pragma once

#include "domain/types.hpp"
#include "logging/logger.hpp"

#include <httplib.h>
#include <nlohmann/json.hpp>

#include <string_view>

namespace pixelanea::api {

httplib::Response respond_error(const logging::ScopedLogger& log, int status,
                                std::string_view event, const std::string& message,
                                nlohmann::json fields = nlohmann::json::object());
bool content_type_is_octet_stream(const httplib::Request& req);
bool accept_prefers_octet_stream(const httplib::Request& req);
void set_frame_binary_headers(httplib::Response& res, const domain::Frame& frame);

}  // namespace pixelanea::api
