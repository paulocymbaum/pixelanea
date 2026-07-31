#include "api/api_server.hpp"

#include "api/http_response.hpp"
#include "logging/http_request_log.hpp"

#include <nlohmann/json.hpp>

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
                        {"createdAt", project.created_at},
                        {"updatedAt", project.updated_at}};
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
  return params;
}

domain::DuplicateFramesParams parse_duplicate_frames_request(const nlohmann::json& body) {
  domain::DuplicateFramesParams params;
  params.target_frame_count = body.at("frameCount").get<int>();
  if (body.contains("sourceFrameIndex")) {
    params.source_frame_index = body.at("sourceFrameIndex").get<int>();
  }
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

                auto result = frames_.duplicate(id, parse_duplicate_frames_request(body));
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
}

}  // namespace pixelanea::api
