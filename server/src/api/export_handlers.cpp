#include "api/export_handlers.hpp"

#include "api/api_http_helpers.hpp"
#include "api/http_response.hpp"
#include "domain/types.hpp"
#include "export/gif_encoder.hpp"

#include <nlohmann/json.hpp>

namespace pixelanea::api {

httplib::Response handle_export_gif(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);

  nlohmann::json body = nlohmann::json::object();
  if (!req.body.empty()) {
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
    }
  }

  auto project = deps.projects.get(id);
  if (!project.has_value()) {
    return respond_error(deps.log, 404, "project.not_found", project.error(),
                          {{"project_id", id.value}});
  }

  if (project.value().frame_count <= 1) {
    return respond_error(deps.log, 400, "export.gif_insufficient_frames",
                          "GIF export requires more than one frame",
                          {{"project_id", id.value}, {"frame_count", project.value().frame_count}});
  }

  auto palette_result = deps.palettes.get_default(id);
  if (!palette_result.has_value()) {
    return respond_error(deps.log, 404, "palette.get_failed", palette_result.error(),
                          {{"project_id", id.value}});
  }

  double fps = project.value().fps;
  if (body.contains("fps")) {
    fps = body.at("fps").get<double>();
  }
  if (fps < 1.0 || fps > 60.0) {
    return respond_error(deps.log, 400, "export.gif_invalid_fps", "fps must be between 1 and 60",
                          {{"project_id", id.value}, {"fps", fps}});
  }

  bool loop = project.value().loop;
  if (body.contains("loop")) {
    loop = body.at("loop").get<bool>();
  }

  gif::GifEncodeParams params;
  params.width = project.value().width;
  params.height = project.value().height;
  params.fps = fps;
  params.loop = loop;
  params.palette = palette_result.value();

  for (int frame_index = 0; frame_index < project.value().frame_count; ++frame_index) {
    auto frame = deps.frames.get(id, frame_index);
    if (!frame.has_value()) {
      return respond_error(deps.log, 404, "frame.get_failed", frame.error(),
                            {{"project_id", id.value}, {"frame_index", frame_index}});
    }
    params.frames.push_back(std::move(frame.value().pixels));
  }

  auto encoded = gif::encode_gif(params);
  if (!encoded.has_value()) {
    return respond_error(deps.log, 400, "export.gif_encode_failed", encoded.error(),
                          {{"project_id", id.value}});
  }

  httplib::Response res;
  res.status = 200;
  res.set_content(std::string(reinterpret_cast<const char*>(encoded.value().data()),
                              encoded.value().size()),
                  "image/gif");
  return res;
}

}  // namespace pixelanea::api
