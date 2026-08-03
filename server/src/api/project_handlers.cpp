#include "api/project_handlers.hpp"

#include "api/api_http_helpers.hpp"
#include "api/api_json_serializers.hpp"
#include "api/api_request_parsers.hpp"
#include "api/http_response.hpp"
#include "domain/time.hpp"
#include "domain/types.hpp"

#include <nlohmann/json.hpp>

#include <filesystem>

namespace pixelanea::api {

httplib::Response handle_create_project(const httplib::Request& req, const HandlerDeps& deps) {
  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  const auto params = parse_create_request(body);
  auto result = deps.projects.create(params);
  if (!result.has_value()) {
    return respond_error(deps.log, 400, "project.create_failed", result.error());
  }
  return json_response(201, project_to_json(result.value()));
}

httplib::Response handle_open_project(const httplib::Request& req, const HandlerDeps& deps) {
  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  if (!body.contains("path") || body.at("path").get<std::string>().empty()) {
    return respond_error(deps.log, 400, "request.missing_field", "path is required",
                          {{"field", "path"}});
  }

  const auto bundle_path = std::filesystem::path(body.at("path").get<std::string>());
  auto result = deps.projects.open_from_bundle(bundle_path);
  if (!result.has_value()) {
    return respond_error(deps.log, 400, "project.open_failed", result.error(),
                          {{"path", bundle_path.string()}});
  }
  return json_response(200, project_to_json(result.value()));
}

httplib::Response handle_get_project(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  auto result = deps.projects.get(id);
  if (!result.has_value()) {
    return respond_error(deps.log, 404, "project.not_found", result.error(),
                          {{"project_id", id.value}});
  }
  return json_response(200, project_to_json(result.value()));
}

httplib::Response handle_update_project(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  auto result = deps.projects.update(id, parse_update_request(body));
  if (!result.has_value()) {
    const int status = result.error() == "project not found" ? 404 : 400;
    return respond_error(deps.log, status, "project.update_failed", result.error(),
                          {{"project_id", id.value}});
  }
  return json_response(200, project_to_json(result.value()));
}

httplib::Response handle_close_project(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  deps.frames.invalidate_project(id);
  auto result = deps.projects.close(id);
  if (!result.has_value()) {
    return respond_error(deps.log, 404, "project.close_failed", result.error(),
                          {{"project_id", id.value}});
  }
  httplib::Response res;
  res.status = 204;
  return res;
}

httplib::Response handle_save_project(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  if (!body.contains("path") || body.at("path").get<std::string>().empty()) {
    return respond_error(deps.log, 400, "request.missing_field", "path is required",
                          {{"field", "path"}, {"project_id", id.value}});
  }

  const auto bundle_path = std::filesystem::path(body.at("path").get<std::string>());

  if (const auto asset_type = parse_asset_type_field(body, "assetType")) {
    domain::UpdateProjectParams update_params;
    update_params.asset_type = asset_type;
    auto updated = deps.projects.update(id, update_params);
    if (!updated.has_value()) {
      const int status = updated.error() == "project not found" ? 404 : 400;
      return respond_error(deps.log, status, "project.update_failed", updated.error(),
                          {{"project_id", id.value}});
    }
  }

  auto result = deps.projects.save_to_bundle(id, bundle_path);
  if (!result.has_value()) {
    const int status = result.error() == "project not found" ? 404 : 400;
    return respond_error(deps.log, status, "project.save_failed", result.error(),
                        {{"project_id", id.value}, {"path", bundle_path.string()}});
  }

  const auto updated = deps.projects.get(id);
  const std::string saved_at =
      updated.has_value() ? updated.value().updated_at : domain::utc_now_iso8601();
  return json_response(200, nlohmann::json{{"path", bundle_path.string()},
                                             {"savedAt", saved_at}});
}

}  // namespace pixelanea::api
