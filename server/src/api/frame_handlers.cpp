#include "api/frame_handlers.hpp"

#include "api/api_http_helpers.hpp"
#include "api/api_json_serializers.hpp"
#include "api/api_request_parsers.hpp"
#include "api/http_response.hpp"
#include "domain/types.hpp"

#include <nlohmann/json.hpp>

namespace pixelanea::api {

httplib::Response handle_list_frames(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  auto result = deps.frames.list(id);
  if (!result.has_value()) {
    return respond_error(deps.log, 404, "frame.list_failed", result.error(),
                          {{"project_id", id.value}});
  }

  nlohmann::json frames = nlohmann::json::array();
  for (const auto& frame : result.value()) {
    frames.push_back(frame_metadata_to_json(frame));
  }
  return json_response(200, nlohmann::json{{"frames", frames}});
}

httplib::Response handle_duplicate_frames(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  domain::DuplicateFramesParams params;
  try {
    params = parse_duplicate_frames_request(body);
  } catch (const std::exception& ex) {
    return respond_error(deps.log, 400, "request.invalid_body", ex.what(),
                          {{"project_id", id.value}});
  }

  auto result = deps.frames.duplicate(id, params);
  if (!result.has_value()) {
    const int status =
        result.error() == "project not found" || result.error() == "frame not found" ? 404 : 400;
    return respond_error(deps.log, status, "frame.duplicate_failed", result.error(),
                          {{"project_id", id.value}});
  }

  nlohmann::json frames = nlohmann::json::array();
  for (const auto& frame : result.value().frames) {
    frames.push_back(frame_metadata_to_json(frame));
  }
  return json_response(200, nlohmann::json{{"project", project_to_json(result.value().project)},
                                            {"frames", frames}});
}

httplib::Response handle_copy_frame(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  domain::CopyFrameParams params;
  try {
    params = parse_copy_frame_request(body);
  } catch (const std::exception& ex) {
    return respond_error(deps.log, 400, "request.invalid_body", ex.what(),
                          {{"project_id", id.value}});
  }

  auto result = deps.frames.copy_frame(id, params);
  if (!result.has_value()) {
    const int status =
        result.error() == "project not found" || result.error() == "frame not found" ? 404 : 400;
    return respond_error(deps.log, status, "frame.copy_failed", result.error(),
                          {{"project_id", id.value}});
  }

  return json_response(200, nlohmann::json{{"frame", frame_metadata_to_json(result.value())}});
}

httplib::Response handle_reorder_frames(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  domain::ReorderFramesParams params;
  try {
    params = parse_reorder_frames_request(body);
  } catch (const std::exception& ex) {
    return respond_error(deps.log, 400, "request.invalid_body", ex.what(),
                          {{"project_id", id.value}});
  }

  auto result = deps.frames.reorder(id, params);
  if (!result.has_value()) {
    const int status =
        result.error() == "project not found" || result.error() == "frame not found" ? 404 : 400;
    return respond_error(deps.log, status, "frame.reorder_failed", result.error(),
                          {{"project_id", id.value}});
  }

  nlohmann::json frames = nlohmann::json::array();
  for (const auto& frame : result.value()) {
    frames.push_back(frame_metadata_to_json(frame));
  }
  return json_response(200, nlohmann::json{{"frames", frames}});
}

httplib::Response handle_get_frame(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  const int frame_index = std::stoi(req.matches[2]);
  auto result = deps.frames.get(id, frame_index);
  if (!result.has_value()) {
    return respond_error(deps.log, 404, "frame.get_failed", result.error(),
                          {{"project_id", id.value}, {"frame_index", frame_index}});
  }
  const domain::Frame& frame = result.value();
  if (accept_prefers_octet_stream(req)) {
    httplib::Response res;
    res.status = 200;
    set_frame_binary_headers(res, frame);
    res.set_content(
        std::string(reinterpret_cast<const char*>(frame.pixels.data()), frame.pixels.size()),
        "application/octet-stream");
    return res;
  }
  return json_response(200, frame_to_json(frame));
}

httplib::Response handle_put_frame(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  const int frame_index = std::stoi(req.matches[2]);

  auto project = deps.projects.get(id);
  if (!project.has_value()) {
    return respond_error(deps.log, 404, "project.not_found", project.error(),
                          {{"project_id", id.value}});
  }

  domain::Frame frame;
  frame.index = frame_index;
  frame.width = project.value().width;
  frame.height = project.value().height;

  if (content_type_is_octet_stream(req)) {
    const std::size_t expected =
        static_cast<std::size_t>(frame.width) * static_cast<std::size_t>(frame.height);
    if (req.body.size() != expected) {
      return respond_error(deps.log, 400, "frame.put_invalid_pixels",
                            "pixel byte count does not match frame size",
                            {{"project_id", id.value},
                             {"frame_index", frame_index},
                             {"expected", static_cast<int>(expected)},
                             {"actual", static_cast<int>(req.body.size())}});
    }
    frame.pixels.assign(reinterpret_cast<const uint8_t*>(req.body.data()),
                        reinterpret_cast<const uint8_t*>(req.body.data()) + req.body.size());
  } else {
    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
    }
    frame.pixels = body.at("pixels").get<std::vector<uint8_t>>();
  }

  auto result = deps.frames.put(id, frame);
  if (!result.has_value()) {
    const int status = result.error() == "project not found" || result.error() == "frame not found"
                           ? 404
                           : 400;
    return respond_error(deps.log, status, "frame.put_failed", result.error(),
                          {{"project_id", id.value}, {"frame_index", frame_index}});
  }
  return json_response(200, frame_metadata_to_json(result.value()));
}

httplib::Response handle_patch_frame_cells(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);
  const int frame_index = std::stoi(req.matches[2]);

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  std::vector<domain::CellChange> changes;
  try {
    changes = parse_patch_frame_cells_request(body);
  } catch (const std::exception& ex) {
    return respond_error(deps.log, 400, "request.invalid_body", ex.what(),
                          {{"project_id", id.value}, {"frame_index", frame_index}});
  }

  auto result = deps.frames.patch_cells(id, frame_index, changes);
  if (!result.has_value()) {
    const std::string& error = result.error();
    int status = 400;
    if (error == "project not found" || error == "frame not found") {
      status = 404;
    } else if (error == "cell conflict") {
      status = 409;
    }
    return respond_error(deps.log, status, "frame.patch_cells_failed", error,
                          {{"project_id", id.value}, {"frame_index", frame_index}});
  }

  return json_response(200, frame_metadata_to_json(result.value()));
}

}  // namespace pixelanea::api
