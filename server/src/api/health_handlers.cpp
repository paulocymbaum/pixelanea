#include "api/health_handlers.hpp"

#include "api/http_response.hpp"

#include <nlohmann/json.hpp>

namespace pixelanea::api {

httplib::Response handle_health() {
  return json_response(200, nlohmann::json{{"status", "ok"}, {"version", kServerVersion}});
}

}  // namespace pixelanea::api
