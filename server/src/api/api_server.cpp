#include "api/api_server.hpp"

#include "api/base64.hpp"
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

}  // namespace

ApiServer::ApiServer(db::ProjectRepository& projects, db::FrameRepository& frames,
                     db::PaletteRepository& palettes, logging::Logger& logger)
    : projects_(projects),
      frames_(frames),
      palettes_(palettes),
      log_(logger, "api", "ApiServer"),
      http_request_log_(logger) {}

void ApiServer::register_routes(httplib::Server& server) const {
  http_request_log_.install(server);
  server.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
    res = json_response(200, nlohmann::json{{"status", "ok"}, {"version", kServerVersion}});
  });

  server.Post("/api/projects", [this](const httplib::Request& req, httplib::Response& res) {
    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      res = error_response(400, "invalid JSON body");
      return;
    }

    const auto params = parse_create_request(body);
    auto result = projects_.create(params);
    if (!result.has_value()) {
      res = error_response(400, result.error());
      return;
    }
    res = json_response(201, project_to_json(result.value()));
  });

  server.Post("/api/projects/open", [this](const httplib::Request& req, httplib::Response& res) {
    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      res = error_response(400, "invalid JSON body");
      return;
    }

    if (!body.contains("path") || body.at("path").get<std::string>().empty()) {
      res = error_response(400, "path is required");
      return;
    }

    const auto bundle_path = std::filesystem::path(body.at("path").get<std::string>());
    auto result = projects_.open_from_bundle(bundle_path);
    if (!result.has_value()) {
      res = error_response(400, result.error());
      return;
    }
    res = json_response(200, project_to_json(result.value()));
  });

  server.Get(R"(/api/projects/([^/]+))", [this](const httplib::Request& req,
                                                   httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    auto result = projects_.get(id);
    if (!result.has_value()) {
      res = error_response(404, result.error());
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
      res = error_response(400, "invalid JSON body");
      return;
    }

    auto result = projects_.update(id, parse_update_request(body));
    if (!result.has_value()) {
      const int status = result.error() == "project not found" ? 404 : 400;
      res = error_response(status, result.error());
      return;
    }
    res = json_response(200, project_to_json(result.value()));
  });

  server.Delete(R"(/api/projects/([^/]+))", [this](const httplib::Request& req,
                                                     httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    auto result = projects_.close(id);
    if (!result.has_value()) {
      res = error_response(404, result.error());
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
                  res = error_response(400, "invalid JSON body");
                  return;
                }

                if (!body.contains("path") || body.at("path").get<std::string>().empty()) {
                  res = error_response(400, "path is required");
                  return;
                }

                const auto bundle_path = std::filesystem::path(body.at("path").get<std::string>());

                if (const auto asset_type = parse_asset_type_field(body, "assetType")) {
                  domain::UpdateProjectParams update_params;
                  update_params.asset_type = asset_type;
                  auto updated = projects_.update(id, update_params);
                  if (!updated.has_value()) {
                    const int status = updated.error() == "project not found" ? 404 : 400;
                    res = error_response(status, updated.error());
                    return;
                  }
                }

                auto result = projects_.save_to_bundle(id, bundle_path);
                if (!result.has_value()) {
                  const int status = result.error() == "project not found" ? 404 : 400;
                  res = error_response(status, result.error());
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
      res = error_response(404, result.error());
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
                  res = error_response(400, "invalid JSON body");
                  return;
                }

                domain::DuplicateFramesParams params;
                try {
                  params = parse_duplicate_frames_request(body);
                } catch (const std::exception& ex) {
                  res = error_response(400, ex.what());
                  return;
                }

                auto result = frames_.duplicate(id, params);
                if (!result.has_value()) {
                  const int status =
                      result.error() == "project not found" || result.error() == "frame not found"
                          ? 404
                          : 400;
                  res = error_response(status, result.error());
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
                  res = error_response(400, "invalid JSON body");
                  return;
                }

                domain::CopyFrameParams params;
                try {
                  params = parse_copy_frame_request(body);
                } catch (const std::exception& ex) {
                  res = error_response(400, ex.what());
                  return;
                }

                auto result = frames_.copy_frame(id, params);
                if (!result.has_value()) {
                  const int status =
                      result.error() == "project not found" || result.error() == "frame not found"
                          ? 404
                          : 400;
                  res = error_response(status, result.error());
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
                  res = error_response(400, "invalid JSON body");
                  return;
                }

                domain::ReorderFramesParams params;
                try {
                  params = parse_reorder_frames_request(body);
                } catch (const std::exception& ex) {
                  res = error_response(400, ex.what());
                  return;
                }

                auto result = frames_.reorder(id, params);
                if (!result.has_value()) {
                  const int status =
                      result.error() == "project not found" || result.error() == "frame not found"
                          ? 404
                          : 400;
                  res = error_response(status, result.error());
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
      res = error_response(404, result.error());
      return;
    }
    res = json_response(200, frame_to_json(result.value()));
  });

  server.Put(R"(/api/projects/([^/]+)/frames/(\d+))", [this](const httplib::Request& req,
                                                                httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    const int frame_index = std::stoi(req.matches[2]);

    nlohmann::json body;
    try {
      body = nlohmann::json::parse(req.body);
    } catch (const nlohmann::json::exception&) {
      res = error_response(400, "invalid JSON body");
      return;
    }

    auto project = projects_.get(id);
    if (!project.has_value()) {
      res = error_response(404, project.error());
      return;
    }

    domain::Frame frame;
    frame.index = frame_index;
    frame.width = project.value().width;
    frame.height = project.value().height;
    frame.pixels = body.at("pixels").get<std::vector<uint8_t>>();

    auto result = frames_.put(id, frame);
    if (!result.has_value()) {
      const int status = result.error() == "project not found" || result.error() == "frame not found"
                             ? 404
                             : 400;
      res = error_response(status, result.error());
      return;
    }
    res = json_response(200, frame_metadata_to_json(result.value()));
  });

  server.Get(R"(/api/projects/([^/]+)/palette)", [this](const httplib::Request& req,
                                                           httplib::Response& res) {
    const domain::ProjectId id(req.matches[1]);
    auto result = palettes_.get_default(id);
    if (!result.has_value()) {
      res = error_response(404, result.error());
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
      res = error_response(400, "invalid JSON body");
      return;
    }

    auto result = palettes_.put_default(id, parse_put_palette_request(body));
    if (!result.has_value()) {
      const int status = result.error() == "project not found" || result.error() == "palette not found"
                             ? 404
                             : 400;
      res = error_response(status, result.error());
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
                  res = error_response(400, "invalid JSON body");
                  return;
                }

                auto project = projects_.get(id);
                if (!project.has_value()) {
                  res = error_response(404, project.error());
                  return;
                }

                if (!body.contains("imageData")) {
                  res = error_response(400, "imageData is required");
                  return;
                }

                std::string decode_error;
                const auto image_bytes =
                    decode_base64(body.at("imageData").get<std::string>(), decode_error);
                if (!decode_error.empty()) {
                  res = error_response(400, decode_error);
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
                  res = error_response(400, "invalid frame index");
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
                  res = error_response(404, palette_result.error());
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
                  res = error_response(400, pixelated.error());
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
                    res = error_response(status, palette_put.error());
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
                  res = error_response(status, saved.error());
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
                    res = error_response(400, "invalid JSON body");
                    return;
                  }
                }

                auto project = projects_.get(id);
                if (!project.has_value()) {
                  res = error_response(404, project.error());
                  return;
                }

                if (project.value().frame_count <= 1) {
                  res = error_response(400, "GIF export requires more than one frame");
                  return;
                }

                auto palette_result = palettes_.get_default(id);
                if (!palette_result.has_value()) {
                  res = error_response(404, palette_result.error());
                  return;
                }

                double fps = project.value().fps;
                if (body.contains("fps")) {
                  fps = body.at("fps").get<double>();
                }
                if (fps < 1.0 || fps > 60.0) {
                  res = error_response(400, "fps must be between 1 and 60");
                  return;
                }

                bool loop = true;
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
                    res = error_response(404, frame.error());
                    return;
                  }
                  params.frames.push_back(std::move(frame.value().pixels));
                }

                auto encoded = gif::encode_gif(params);
                if (!encoded.has_value()) {
                  res = error_response(400, encoded.error());
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
