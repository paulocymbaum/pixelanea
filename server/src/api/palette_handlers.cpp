#include "api/palette_handlers.hpp"

#include "api/api_http_helpers.hpp"
#include "api/api_json_serializers.hpp"
#include "api/api_request_parsers.hpp"
#include "api/http_response.hpp"
#include "domain/types.hpp"

#include <nlohmann/json.hpp>

namespace pixelanea::api {

httplib::Response handle_get_palette(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  auto result = deps.palettes.get_default(id);
  if (!result.has_value()) {
    return respond_error(deps.log, 404, "palette.get_failed", result.error(),
                          {{"project_id", id.value}});
  }
  return json_response(200, palette_to_json(result.value()));
}

httplib::Response handle_put_palette(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  auto result = deps.palettes.put_default(id, parse_put_palette_request(body));
  if (!result.has_value()) {
    const int status = result.error() == "project not found" || result.error() == "palette not found"
                           ? 404
                           : 400;
    return respond_error(deps.log, status, "palette.put_failed", result.error(),
                          {{"project_id", id.value}});
  }
  return json_response(200, palette_to_json(result.value()));
}

}  // namespace pixelanea::api
