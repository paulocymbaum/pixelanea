#pragma once

#include <httplib.h>
#include <nlohmann/json.hpp>

namespace pixelanea::api {

inline constexpr const char* kServerVersion = "1.9.0";

inline httplib::Response json_response(int status, const nlohmann::json& body) {
  httplib::Response response;
  response.status = status;
  response.set_content(body.dump(), "application/json");
  return response;
}

inline httplib::Response error_response(int status, const std::string& message) {
  return json_response(status, nlohmann::json{{"message", message}});
}

}  // namespace pixelanea::api
