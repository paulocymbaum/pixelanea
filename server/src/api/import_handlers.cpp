#include "api/import_handlers.hpp"

#include "api/api_http_helpers.hpp"
#include "api/api_json_serializers.hpp"
#include "api/base64.hpp"
#include "api/http_response.hpp"
#include "domain/types.hpp"
#include "image/pixelate.hpp"

#include <nlohmann/json.hpp>

namespace pixelanea::api {

httplib::Response handle_import_pixelate(const httplib::Request& req, const HandlerDeps& deps) {
  const domain::ProjectId id(req.matches[1]);

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  auto project = deps.projects.get(id);
  if (!project.has_value()) {
    return respond_error(deps.log, 404, "project.not_found", project.error(),
                          {{"project_id", id.value}});
  }

  if (!body.contains("imageData")) {
    return respond_error(deps.log, 400, "request.missing_field", "imageData is required",
                          {{"project_id", id.value}, {"field", "imageData"}});
  }

  std::string decode_error;
  const auto image_bytes = decode_base64(body.at("imageData").get<std::string>(), decode_error);
  if (!decode_error.empty()) {
    return respond_error(deps.log, 400, "import.decode_failed", decode_error,
                          {{"project_id", id.value}});
  }

  int target_width = project.value().width;
  int target_height = project.value().height;
  if (body.contains("targetWidth")) {
    target_width = body.at("targetWidth").get<int>();
  }
  if (body.contains("targetHeight")) {
    target_height = body.at("targetHeight").get<int>();
  }

  int frame_index = 0;
  if (body.contains("frameIndex")) {
    frame_index = body.at("frameIndex").get<int>();
  }
  if (frame_index < 0 || frame_index >= project.value().frame_count) {
    return respond_error(deps.log, 400, "import.invalid_frame_index", "invalid frame index",
                          {{"project_id", id.value}, {"frame_index", frame_index}});
  }

  int max_colors = 0;
  if (body.contains("maxColors")) {
    max_colors = body.at("maxColors").get<int>();
  }

  bool remove_background = true;
  if (body.contains("removeBackground")) {
    remove_background = body.at("removeBackground").get<bool>();
  }

  auto palette_result = deps.palettes.get_default(id);
  if (!palette_result.has_value()) {
    return respond_error(deps.log, 404, "palette.get_failed", palette_result.error(),
                          {{"project_id", id.value}});
  }

  image::PixelateParams params;
  params.image_data = image_bytes.data();
  params.image_size = image_bytes.size();
  params.target_width = target_width;
  params.target_height = target_height;
  params.max_colors = max_colors;
  params.remove_background = remove_background;
  params.palette = palette_result.value();

  auto pixelated = image::pixelate(params);
  if (!pixelated.has_value()) {
    return respond_error(deps.log, 400, "import.pixelate_failed", pixelated.error(),
                          {{"project_id", id.value}, {"frame_index", frame_index}});
  }

  if (pixelated.value().palette_updated) {
    auto palette_put = deps.palettes.put_default(id, pixelated.value().palette);
    if (!palette_put.has_value()) {
      const int status =
          palette_put.error() == "project not found" || palette_put.error() == "palette not found"
              ? 404
              : 400;
      return respond_error(deps.log, status, "palette.put_failed", palette_put.error(),
                            {{"project_id", id.value}});
    }
    palette_result = palette_put;
  }

  domain::Frame frame;
  frame.index = frame_index;
  frame.width = pixelated.value().grid.width;
  frame.height = pixelated.value().grid.height;
  frame.pixels = std::move(pixelated.value().grid.indices);

  auto saved = deps.frames.put(id, frame);
  if (!saved.has_value()) {
    const int status =
        saved.error() == "project not found" || saved.error() == "frame not found" ? 404 : 400;
    return respond_error(deps.log, status, "import.frame_save_failed", saved.error(),
                          {{"project_id", id.value}, {"frame_index", frame_index}});
  }

  nlohmann::json response{{"frameIndex", frame_index},
                          {"width", frame.width},
                          {"height", frame.height},
                          {"pixels", frame.pixels}};
  if (pixelated.value().palette_updated) {
    response["palette"] = palette_to_json(palette_result.value());
  }
  return json_response(200, response);
}

}  // namespace pixelanea::api
