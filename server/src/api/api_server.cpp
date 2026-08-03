#include "api/api_server.hpp"

#include "api/base64.hpp"
#include "api/file_dialog_handlers.hpp"
#include "api/http_response.hpp"
#include "domain/time.hpp"
#include "export/gif_encoder.hpp"
#include "image/pixelate.hpp"
#include "logging/http_request_log.hpp"

#include <nlohmann/json.hpp>

#include <filesystem>
#include <string>

namespace pixelanea::api {

namespace {

nlohmann::json project_to_json(const domain::Project& project) {
  return nlohmann::json{{"id", project.id.value},
                        {"name", project.name},
                        {"width", project.width},
                        {"height", project.height},
                        {"frameCount", project.frame_count},
                        {"fps", project.fps},
                        {"cellSize", project.cell_size},
                        {"assetType", domain::asset_type_to_string(project.asset_type)},
                        {"loop", project.loop},
                        {"createdAt", project.created_at},
                        {"updatedAt", project.updated_at}};
}

std::optional<domain::AssetType> parse_asset_type_field(const nlohmann::json& body,
                                                          const char* key) {
  if (!body.contains(key)) {
    return std::nullopt;
  }
  return domain::asset_type_from_string(body.at(key).get<std::string>());
}

nlohmann::json frame_metadata_to_json(const domain::FrameMetadata& frame) {
  return nlohmann::json{{"index", frame.index},
                        {"width", frame.width},
                        {"height", frame.height},
                        {"updatedAt", frame.updated_at}};
}

nlohmann::json frame_to_json(const domain::Frame& frame) {
  return nlohmann::json{{"index", frame.index},
                        {"width", frame.width},
                        {"height", frame.height},
                        {"updatedAt", frame.updated_at},
                        {"pixels", frame.pixels}};
}

nlohmann::json color_to_json(const domain::Color& color) {
  nlohmann::json json{{"slot", color.slot}, {"hex", color.hex}};
  if (color.name) {
    json["name"] = *color.name;
  }
  return json;
}

nlohmann::json palette_to_json(const domain::Palette& palette) {
  nlohmann::json colors = nlohmann::json::array();
  for (const auto& color : palette.colors) {
    colors.push_back(color_to_json(color));
  }
  return nlohmann::json{{"id", palette.id}, {"name", palette.name}, {"colors", colors}};
}

domain::Palette parse_put_palette_request(const nlohmann::json& body) {
  domain::Palette palette;
  if (body.contains("name")) {
    palette.name = body.at("name").get<std::string>();
  }
  for (const auto& item : body.at("colors")) {
    domain::Color color;
    color.slot = item.at("slot").get<int>();
    color.hex = item.at("hex").get<std::string>();
    if (item.contains("name") && !item.at("name").is_null()) {
      color.name = item.at("name").get<std::string>();
    }
    palette.colors.push_back(std::move(color));
  }
  return palette;
}

domain::CreateProjectParams parse_create_request(const nlohmann::json& body) {
  domain::CreateProjectParams params;
  params.name = body.at("name").get<std::string>();
  params.width = body.at("width").get<int>();
  params.height = body.at("height").get<int>();
  if (body.contains("frameCount")) {
    params.frame_count = body.at("frameCount").get<int>();
  }
  if (body.contains("fps")) {
    params.fps = body.at("fps").get<double>();
  }
  if (body.contains("cellSize")) {
    params.cell_size = body.at("cellSize").get<int>();
  }
  if (const auto asset_type = parse_asset_type_field(body, "assetType")) {
    params.asset_type = *asset_type;
  }
  if (body.contains("loop")) {
    params.loop = body.at("loop").get<bool>();
  }
  return params;
}

domain::UpdateProjectParams parse_update_request(const nlohmann::json& body) {
  domain::UpdateProjectParams params;
  if (body.contains("name")) {
    params.name = body.at("name").get<std::string>();
  }
  if (body.contains("fps")) {
    params.fps = body.at("fps").get<double>();
  }
  if (body.contains("cellSize")) {
    params.cell_size = body.at("cellSize").get<int>();
  }
  if (const auto asset_type = parse_asset_type_field(body, "assetType")) {
    params.asset_type = *asset_type;
  }
  if (body.contains("loop")) {
    params.loop = body.at("loop").get<bool>();
  }
  return params;
}

domain::DuplicateFramesParams parse_duplicate_frames_request(const nlohmann::json& body) {
  domain::DuplicateFramesParams params;
  params.target_frame_count = body.at("frameCount").get<int>();
  if (body.contains("sourceFrameIndex")) {
    params.source_frame_index = body.at("sourceFrameIndex").get<int>();
  }
  if (body.contains("fillMode")) {
    const std::string fill_mode = body.at("fillMode").get<std::string>();
    if (fill_mode == "blank") {
      params.fill_mode = domain::DuplicateFillMode::Blank;
    } else if (fill_mode != "copy") {
      throw std::runtime_error("fillMode must be copy or blank");
    }
  }
  return params;
}

domain::CopyFrameParams parse_copy_frame_request(const nlohmann::json& body) {
  domain::CopyFrameParams params;
  params.source_frame_index = body.at("sourceFrameIndex").get<int>();
  params.target_frame_index = body.at("targetFrameIndex").get<int>();
  return params;
}

domain::ReorderFramesParams parse_reorder_frames_request(const nlohmann::json& body) {
  domain::ReorderFramesParams params;
  params.from_index = body.at("fromIndex").get<int>();
  params.to_index = body.at("toIndex").get<int>();
  return params;
}

std::vector<domain::CellChange> parse_patch_frame_cells_request(const nlohmann::json& body) {
  if (!body.is_array()) {
    throw std::runtime_error("request body must be a JSON array of cell changes");
  }

  std::vector<domain::CellChange> changes;
  changes.reserve(body.size());
  for (const auto& item : body) {
    domain::CellChange change;
    change.x = item.at("x").get<int>();
    change.y = item.at("y").get<int>();
    change.previous = static_cast<uint8_t>(item.at("previous").get<int>());
    change.next = static_cast<uint8_t>(item.at("next").get<int>());
    changes.push_back(change);
  }
  return changes;
}

httplib::Response respond_error(const logging::ScopedLogger& log, int status,
                                std::string_view event, const std::string& message,
                                nlohmann::json fields = nlohmann::json::object()) {
  fields["status"] = status;
  fields["error"] = message;
  if (status >= 500) {
    log.error(event, std::move(fields));
  } else {
    log.warn(event, std::move(fields));
  }
  return error_response(status, message);
}

bool content_type_is_octet_stream(const httplib::Request& req) {
  const std::string content_type = req.get_header_value("Content-Type");
  return content_type.rfind("application/octet-stream", 0) == 0;
}

bool accept_prefers_octet_stream(const httplib::Request& req) {
  const std::string accept = req.get_header_value("Accept");
  if (accept.empty()) {
    return false;
  }

  double octet_q = -1.0;
  double json_q = -1.0;

  std::size_t start = 0;
  while (start < accept.size()) {
    std::size_t end = accept.find(',', start);
    if (end == std::string::npos) {
      end = accept.size();
    }

    std::string token = accept.substr(start, end - start);
    while (!token.empty() && (token.front() == ' ' || token.front() == '\t')) {
      token.erase(token.begin());
    }
    while (!token.empty() && (token.back() == ' ' || token.back() == '\t')) {
      token.pop_back();
    }

    double q = 1.0;
    const std::size_t semicolon = token.find(';');
    std::string media = token;
    if (semicolon != std::string::npos) {
      media = token.substr(0, semicolon);
      std::string params = token.substr(semicolon + 1);
      while (!params.empty() && (params.front() == ' ' || params.front() == '\t')) {
        params.erase(params.begin());
      }
      if (params.rfind("q=", 0) == 0) {
        try {
          q = std::stod(params.substr(2));
        } catch (const std::exception&) {
          q = 0.0;
        }
      }
    }

    while (!media.empty() && (media.back() == ' ' || media.back() == '\t')) {
      media.pop_back();
    }

    if (media == "application/octet-stream") {
      octet_q = std::max(octet_q, q);
    }
    if (media == "application/json") {
      json_q = std::max(json_q, q);
    }

    start = end + 1;
  }

  if (octet_q < 0.0) {
    return false;
  }
  if (json_q < 0.0) {
    return true;
  }
  return octet_q > json_q;
}

void set_frame_binary_headers(httplib::Response& res, const domain::Frame& frame) {
  res.set_header("X-Frame-Index", std::to_string(frame.index));
  res.set_header("X-Frame-Width", std::to_string(frame.width));
  res.set_header("X-Frame-Height", std::to_string(frame.height));
  res.set_header("X-Frame-Updated-At", frame.updated_at);
}

}  // namespace

ApiServer::ApiServer(db::ProjectRepository& projects, db::FrameRepository& frames,
                     db::PaletteRepository& palettes, logging::Logger& logger,
                     std::unique_ptr<FileDialogProvider> file_dialog)
    : projects_(projects),
      frames_(frames),
      palettes_(palettes),
      file_dialog_(std::move(file_dialog)),
      log_(logger, "api", "ApiServer"),
      http_request_log_(logger) {}

void ApiServer::register_routes(httplib::Server& server) const {
  http_request_log_.install(server);
  server.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
    res = json_response(200, nlohmann::json{{"status", "ok"}, {"version", kServerVersion}});
  });

  server.Post("/api/dialog/pick-project-path",
              [this](const httplib::Request& req, httplib::Response& res) {
                if (!file_dialog_) {
                  res = respond_error(log_, 503, "dialog.unavailable",
                                      "native file dialog is not configured");
                  return;
                }

                nlohmann::json body;
                try {
                  body = nlohmann::json::parse(req.body);
                } catch (const nlohmann::json::exception&) {
                  res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                  return;
                }

                res = handle_pick_project_path(body, *file_dialog_, log_);
              });

  server.Post("/api/projects", [this](const httplib::Request& req, httplib::Response& res) {
    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
      return;
    }

    const auto params = parse_create_request(body);
    auto result = projects_.create(params);
    if (!result.has_value()) {
      res = respond_error(log_, 400, "project.create_failed", result.error());
      return;
    }
    res = json_response(201, project_to_json(result.value()));
  });

  server.Post("/api/projects/open", [this](const httplib::Request& req, httplib::Response& res) {
    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
      return;
    }

    if (!body.contains("path") || body.at("path").get<std::string>().empty()) {
      res = respond_error(log_, 400, "request.missing_field", "path is required",
                          {{"field", "path"}});
      return;
    }

    const auto bundle_path = std::filesystem::path(body.at("path").get<std::string>());
    auto result = projects_.open_from_bundle(bundle_path);
    if (!result.has_value()) {
      res = respond_error(log_, 400, "project.open_failed", result.error(),
                          {{"path", bundle_path.string()}});
      return;
    }
    res = json_response(200, project_to_json(result.value()));
  });

  server.Get(R"(/api/projects/([^/]+))", [this](const httplib::Request& req,
                                                   httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    auto result = projects_.get(id);
    if (!result.has_value()) {
      res = respond_error(log_, 404, "project.not_found", result.error(),
                          {{"project_id", id.value}});
      return;
    }
    res = json_response(200, project_to_json(result.value()));
  });

  server.Patch(R"(/api/projects/([^/]+))", [this](const httplib::Request& req,
                                                    httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
      return;
    }

    auto result = projects_.update(id, parse_update_request(body));
    if (!result.has_value()) {
      const int status = result.error() == "project not found" ? 404 : 400;
      res = respond_error(log_, status, "project.update_failed", result.error(),
                          {{"project_id", id.value}});
      return;
    }
    res = json_response(200, project_to_json(result.value()));
  });

  server.Delete(R"(/api/projects/([^/]+))", [this](const httplib::Request& req,
                                                     httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    frames_.invalidate_project(id);
    auto result = projects_.close(id);
    if (!result.has_value()) {
      res = respond_error(log_, 404, "project.close_failed", result.error(),
                          {{"project_id", id.value}});
      return;
    }
    res.status = 204;
  });

  server.Post(R"(/api/projects/([^/]+)/save)",
              [this](const httplib::Request& req, httplib::Response& res) {
                const domain::ProjectId id(req.matches[1]);

                nlohmann::json body;
                try {
                  body = nlohmann::json::parse(req.body);
                } catch (const nlohmann::json::exception&) {
                  res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                  return;
                }

                if (!body.contains("path") || body.at("path").get<std::string>().empty()) {
                  res = respond_error(log_, 400, "request.missing_field", "path is required",
                                      {{"field", "path"}, {"project_id", id.value}});
                  return;
                }

                const auto bundle_path = std::filesystem::path(body.at("path").get<std::string>());

                if (const auto asset_type = parse_asset_type_field(body, "assetType")) {
                  domain::UpdateProjectParams update_params;
                  update_params.asset_type = asset_type;
                  auto updated = projects_.update(id, update_params);
                  if (!updated.has_value()) {
                    const int status = updated.error() == "project not found" ? 404 : 400;
                    res = respond_error(log_, status, "project.update_failed", updated.error(),
                                        {{"project_id", id.value}});
                    return;
                  }
                }

                auto result = projects_.save_to_bundle(id, bundle_path);
                if (!result.has_value()) {
                  const int status = result.error() == "project not found" ? 404 : 400;
                  res = respond_error(log_, status, "project.save_failed", result.error(),
                                      {{"project_id", id.value}, {"path", bundle_path.string()}});
                  return;
                }

                const auto updated = projects_.get(id);
                const std::string saved_at =
                    updated.has_value() ? updated.value().updated_at : domain::utc_now_iso8601();
                res = json_response(200, nlohmann::json{{"path", bundle_path.string()},
                                                          {"savedAt", saved_at}});
              });

  server.Get(R"(/api/projects/([^/]+)/frames)", [this](const httplib::Request& req,
                                                         httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    auto result = frames_.list(id);
    if (!result.has_value()) {
      res = respond_error(log_, 404, "frame.list_failed", result.error(),
                          {{"project_id", id.value}});
      return;
    }

    nlohmann::json frames = nlohmann::json::array();
    for (const auto& frame : result.value()) {
      frames.push_back(frame_metadata_to_json(frame));
    }
    res = json_response(200, nlohmann::json{{"frames", frames}});
  });

  server.Post(R"(/api/projects/([^/]+)/frames/duplicate)",
              [this](const httplib::Request& req, httplib::Response& res) {
                const domain::ProjectId id(req.matches[1]);

                nlohmann::json body;
                try {
                  body = nlohmann::json::parse(req.body);
                } catch (const nlohmann::json::exception&) {
                  res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                  return;
                }

                domain::DuplicateFramesParams params;
                try {
                  params = parse_duplicate_frames_request(body);
                } catch (const std::exception& ex) {
                  res = respond_error(log_, 400, "request.invalid_body", ex.what(),
                                      {{"project_id", id.value}});
                  return;
                }

                auto result = frames_.duplicate(id, params);
                if (!result.has_value()) {
                  const int status =
                      result.error() == "project not found" || result.error() == "frame not found"
                          ? 404
                          : 400;
                  res = respond_error(log_, status, "frame.duplicate_failed", result.error(),
                                      {{"project_id", id.value}});
                  return;
                }

                nlohmann::json frames = nlohmann::json::array();
                for (const auto& frame : result.value().frames) {
                  frames.push_back(frame_metadata_to_json(frame));
                }
                res = json_response(200,
                                    nlohmann::json{{"project", project_to_json(result.value().project)},
                                                   {"frames", frames}});
              });

  server.Post(R"(/api/projects/([^/]+)/frames/copy)",
              [this](const httplib::Request& req, httplib::Response& res) {
                const domain::ProjectId id(req.matches[1]);

                nlohmann::json body;
                try {
                  body = nlohmann::json::parse(req.body);
                } catch (const nlohmann::json::exception&) {
                  res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                  return;
                }

                domain::CopyFrameParams params;
                try {
                  params = parse_copy_frame_request(body);
                } catch (const std::exception& ex) {
                  res = respond_error(log_, 400, "request.invalid_body", ex.what(),
                                      {{"project_id", id.value}});
                  return;
                }

                auto result = frames_.copy_frame(id, params);
                if (!result.has_value()) {
                  const int status =
                      result.error() == "project not found" || result.error() == "frame not found"
                          ? 404
                          : 400;
                  res = respond_error(log_, status, "frame.copy_failed", result.error(),
                                      {{"project_id", id.value}});
                  return;
                }

                res = json_response(200,
                                    nlohmann::json{{"frame", frame_metadata_to_json(result.value())}});
              });

  server.Post(R"(/api/projects/([^/]+)/frames/reorder)",
              [this](const httplib::Request& req, httplib::Response& res) {
                const domain::ProjectId id(req.matches[1]);

                nlohmann::json body;
                try {
                  body = nlohmann::json::parse(req.body);
                } catch (const nlohmann::json::exception&) {
                  res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                  return;
                }

                domain::ReorderFramesParams params;
                try {
                  params = parse_reorder_frames_request(body);
                } catch (const std::exception& ex) {
                  res = respond_error(log_, 400, "request.invalid_body", ex.what(),
                                      {{"project_id", id.value}});
                  return;
                }

                auto result = frames_.reorder(id, params);
                if (!result.has_value()) {
                  const int status =
                      result.error() == "project not found" || result.error() == "frame not found"
                          ? 404
                          : 400;
                  res = respond_error(log_, status, "frame.reorder_failed", result.error(),
                                      {{"project_id", id.value}});
                  return;
                }

                nlohmann::json frames = nlohmann::json::array();
                for (const auto& frame : result.value()) {
                  frames.push_back(frame_metadata_to_json(frame));
                }
                res = json_response(200, nlohmann::json{{"frames", frames}});
              });

  server.Get(R"(/api/projects/([^/]+)/frames/(\d+))", [this](const httplib::Request& req,
                                                                httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    const int frame_index = std::stoi(req.matches[2]);
    auto result = frames_.get(id, frame_index);
    if (!result.has_value()) {
      res = respond_error(log_, 404, "frame.get_failed", result.error(),
                          {{"project_id", id.value}, {"frame_index", frame_index}});
      return;
    }
    const domain::Frame& frame = result.value();
    if (accept_prefers_octet_stream(req)) {
      res.status = 200;
      set_frame_binary_headers(res, frame);
      res.set_content(
          std::string(reinterpret_cast<const char*>(frame.pixels.data()), frame.pixels.size()),
          "application/octet-stream");
      return;
    }
    res = json_response(200, frame_to_json(frame));
  });

  server.Put(R"(/api/projects/([^/]+)/frames/(\d+))", [this](const httplib::Request& req,
                                                                httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    const int frame_index = std::stoi(req.matches[2]);

    auto project = projects_.get(id);
    if (!project.has_value()) {
      res = respond_error(log_, 404, "project.not_found", project.error(),
                          {{"project_id", id.value}});
      return;
    }

    domain::Frame frame;
    frame.index = frame_index;
    frame.width = project.value().width;
    frame.height = project.value().height;

    if (content_type_is_octet_stream(req)) {
      const std::size_t expected =
          static_cast<std::size_t>(frame.width) * static_cast<std::size_t>(frame.height);
      if (req.body.size() != expected) {
        res = respond_error(log_, 400, "frame.put_invalid_pixels",
                            "pixel byte count does not match frame size",
                            {{"project_id", id.value},
                             {"frame_index", frame_index},
                             {"expected", static_cast<int>(expected)},
                             {"actual", static_cast<int>(req.body.size())}});
        return;
      }
      frame.pixels.assign(reinterpret_cast<const uint8_t*>(req.body.data()),
                          reinterpret_cast<const uint8_t*>(req.body.data()) + req.body.size());
    } else {
      nlohmann::json body;
      try {
        body = nlohmann::json::parse(req.body);
      } catch (const nlohmann::json::exception&) {
        res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
        return;
      }
      frame.pixels = body.at("pixels").get<std::vector<uint8_t>>();
    }

    auto result = frames_.put(id, frame);
    if (!result.has_value()) {
      const int status = result.error() == "project not found" || result.error() == "frame not found"
                             ? 404
                             : 400;
      res = respond_error(log_, status, "frame.put_failed", result.error(),
                          {{"project_id", id.value}, {"frame_index", frame_index}});
      return;
    }
    res = json_response(200, frame_metadata_to_json(result.value()));
  });

  server.Patch(R"(/api/projects/([^/]+)/frames/(\d+)/cells)",
               [this](const httplib::Request& req, httplib::Response& res) {
                 const domain::ProjectId id(req.matches[1]);
                 const int frame_index = std::stoi(req.matches[2]);

                 nlohmann::json body;
                 try {
                   body = nlohmann::json::parse(req.body);
                 } catch (const nlohmann::json::exception&) {
                   res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                   return;
                 }

                 std::vector<domain::CellChange> changes;
                 try {
                   changes = parse_patch_frame_cells_request(body);
                 } catch (const std::exception& ex) {
                   res = respond_error(log_, 400, "request.invalid_body", ex.what(),
                                       {{"project_id", id.value}, {"frame_index", frame_index}});
                   return;
                 }

                 auto result = frames_.patch_cells(id, frame_index, changes);
                 if (!result.has_value()) {
                   const std::string& error = result.error();
                   int status = 400;
                   if (error == "project not found" || error == "frame not found") {
                     status = 404;
                   } else if (error == "cell conflict") {
                     status = 409;
                   }
                   res = respond_error(log_, status, "frame.patch_cells_failed", error,
                                       {{"project_id", id.value}, {"frame_index", frame_index}});
                   return;
                 }

                 res = json_response(200, frame_metadata_to_json(result.value()));
               });

  server.Get(R"(/api/projects/([^/]+)/palette)", [this](const httplib::Request& req,
                                                           httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    auto result = palettes_.get_default(id);
    if (!result.has_value()) {
      res = respond_error(log_, 404, "palette.get_failed", result.error(),
                          {{"project_id", id.value}});
      return;
    }
    res = json_response(200, palette_to_json(result.value()));
  });

  server.Put(R"(/api/projects/([^/]+)/palette)", [this](const httplib::Request& req,
                                                          httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);

    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
      return;
    }

    auto result = palettes_.put_default(id, parse_put_palette_request(body));
    if (!result.has_value()) {
      const int status = result.error() == "project not found" || result.error() == "palette not found"
                             ? 404
                             : 400;
      res = respond_error(log_, status, "palette.put_failed", result.error(),
                          {{"project_id", id.value}});
      return;
    }
    res = json_response(200, palette_to_json(result.value()));
  });

  server.Post(R"(/api/projects/([^/]+)/import/pixelate)",
              [this](const httplib::Request& req, httplib::Response& res) {
                const domain::ProjectId id(req.matches[1]);

                nlohmann::json body;
                try {
                  body = nlohmann::json::parse(req.body);
                } catch (const nlohmann::json::exception&) {
                  res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                  return;
                }

                auto project = projects_.get(id);
                if (!project.has_value()) {
                  res = respond_error(log_, 404, "project.not_found", project.error(),
                                      {{"project_id", id.value}});
                  return;
                }

                if (!body.contains("imageData")) {
                  res = respond_error(log_, 400, "request.missing_field", "imageData is required",
                                      {{"project_id", id.value}, {"field", "imageData"}});
                  return;
                }

                std::string decode_error;
                const auto image_bytes =
                    decode_base64(body.at("imageData").get<std::string>(), decode_error);
                if (!decode_error.empty()) {
                  res = respond_error(log_, 400, "import.decode_failed", decode_error,
                                      {{"project_id", id.value}});
                  return;
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
                  res = respond_error(log_, 400, "import.invalid_frame_index", "invalid frame index",
                                      {{"project_id", id.value}, {"frame_index", frame_index}});
                  return;
                }

                int max_colors = 0;
                if (body.contains("maxColors")) {
                  max_colors = body.at("maxColors").get<int>();
                }

                bool remove_background = true;
                if (body.contains("removeBackground")) {
                  remove_background = body.at("removeBackground").get<bool>();
                }

                auto palette_result = palettes_.get_default(id);
                if (!palette_result.has_value()) {
                  res = respond_error(log_, 404, "palette.get_failed", palette_result.error(),
                                      {{"project_id", id.value}});
                  return;
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
                  res = respond_error(log_, 400, "import.pixelate_failed", pixelated.error(),
                                      {{"project_id", id.value}, {"frame_index", frame_index}});
                  return;
                }

                if (pixelated.value().palette_updated) {
                  auto palette_put =
                      palettes_.put_default(id, pixelated.value().palette);
                  if (!palette_put.has_value()) {
                    const int status =
                        palette_put.error() == "project not found" ||
                                palette_put.error() == "palette not found"
                            ? 404
                            : 400;
                    res = respond_error(log_, status, "palette.put_failed", palette_put.error(),
                                        {{"project_id", id.value}});
                    return;
                  }
                  palette_result = palette_put;
                }

                domain::Frame frame;
                frame.index = frame_index;
                frame.width = pixelated.value().grid.width;
                frame.height = pixelated.value().grid.height;
                frame.pixels = std::move(pixelated.value().grid.indices);

                auto saved = frames_.put(id, frame);
                if (!saved.has_value()) {
                  const int status =
                      saved.error() == "project not found" || saved.error() == "frame not found"
                          ? 404
                          : 400;
                  res = respond_error(log_, status, "import.frame_save_failed", saved.error(),
                                      {{"project_id", id.value}, {"frame_index", frame_index}});
                  return;
                }

                nlohmann::json response{{"frameIndex", frame_index},
                                        {"width", frame.width},
                                        {"height", frame.height},
                                        {"pixels", frame.pixels}};
                if (pixelated.value().palette_updated) {
                  response["palette"] = palette_to_json(palette_result.value());
                }
                res = json_response(200, response);
              });

  server.Post(R"(/api/projects/([^/]+)/export/gif)",
              [this](const httplib::Request& req, httplib::Response& res) {
                const domain::ProjectId id(req.matches[1]);

                nlohmann::json body = nlohmann::json::object();
                if (!req.body.empty()) {
                  try {
                    body = nlohmann::json::parse(req.body);
                  } catch (const nlohmann::json::exception&) {
                    res = respond_error(log_, 400, "request.invalid_json", "invalid JSON body");
                    return;
                  }
                }

                auto project = projects_.get(id);
                if (!project.has_value()) {
                  res = respond_error(log_, 404, "project.not_found", project.error(),
                                      {{"project_id", id.value}});
                  return;
                }

                if (project.value().frame_count <= 1) {
                  res = respond_error(log_, 400, "export.gif_insufficient_frames",
                                      "GIF export requires more than one frame",
                                      {{"project_id", id.value},
                                       {"frame_count", project.value().frame_count}});
                  return;
                }

                auto palette_result = palettes_.get_default(id);
                if (!palette_result.has_value()) {
                  res = respond_error(log_, 404, "palette.get_failed", palette_result.error(),
                                      {{"project_id", id.value}});
                  return;
                }

                double fps = project.value().fps;
                if (body.contains("fps")) {
                  fps = body.at("fps").get<double>();
                }
                if (fps < 1.0 || fps > 60.0) {
                  res = respond_error(log_, 400, "export.gif_invalid_fps",
                                      "fps must be between 1 and 60",
                                      {{"project_id", id.value}, {"fps", fps}});
                  return;
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

                for (int frame_index = 0; frame_index < project.value().frame_count;
                     ++frame_index) {
                  auto frame = frames_.get(id, frame_index);
                  if (!frame.has_value()) {
                    res = respond_error(log_, 404, "frame.get_failed", frame.error(),
                                        {{"project_id", id.value}, {"frame_index", frame_index}});
                    return;
                  }
                  params.frames.push_back(std::move(frame.value().pixels));
                }

                auto encoded = gif::encode_gif(params);
                if (!encoded.has_value()) {
                  res = respond_error(log_, 400, "export.gif_encode_failed", encoded.error(),
                                      {{"project_id", id.value}});
                  return;
                }

                res.status = 200;
                res.set_content(
                    std::string(reinterpret_cast<const char*>(encoded.value().data()),
                                encoded.value().size()),
                    "image/gif");
              });
}

}  // namespace pixelanea::api
