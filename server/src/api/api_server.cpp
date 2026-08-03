#include "api/api_server.hpp"

#include "api/api_http_helpers.hpp"
#include "api/export_handlers.hpp"
#include "api/file_dialog_handlers.hpp"
#include "api/frame_handlers.hpp"
#include "api/health_handlers.hpp"
#include "api/import_handlers.hpp"
#include "api/palette_handlers.hpp"
#include "api/project_handlers.hpp"
#include "logging/http_request_log.hpp"

#include <nlohmann/json.hpp>


namespace pixelanea::api {

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

  const HandlerDeps deps{projects_, frames_, palettes_, log_, file_dialog_.get()};

  server.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
    res = handle_health();
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

  server.Post("/api/projects", [deps](const httplib::Request& req, httplib::Response& res) {
    res = handle_create_project(req, deps);
  });

  server.Post("/api/projects/open", [deps](const httplib::Request& req, httplib::Response& res) {
    res = handle_open_project(req, deps);
  });

  server.Get(R"(/api/projects/([^/]+))", [deps](const httplib::Request& req,
                                                   httplib::Response& res) {
    res = handle_get_project(req, deps);
  });

  server.Patch(R"(/api/projects/([^/]+))", [deps](const httplib::Request& req,
                                                     httplib::Response& res) {
    res = handle_update_project(req, deps);
  });

  server.Delete(R"(/api/projects/([^/]+))", [deps](const httplib::Request& req,
                                                      httplib::Response& res) {
    res = handle_close_project(req, deps);
  });

  server.Post(R"(/api/projects/([^/]+)/save)",
              [deps](const httplib::Request& req, httplib::Response& res) {
                res = handle_save_project(req, deps);
              });

  server.Get(R"(/api/projects/([^/]+)/frames)", [deps](const httplib::Request& req,
                                                         httplib::Response& res) {
    res = handle_list_frames(req, deps);
  });

  server.Post(R"(/api/projects/([^/]+)/frames/duplicate)",
              [deps](const httplib::Request& req, httplib::Response& res) {
                res = handle_duplicate_frames(req, deps);
              });

  server.Post(R"(/api/projects/([^/]+)/frames/copy)",
              [deps](const httplib::Request& req, httplib::Response& res) {
                res = handle_copy_frame(req, deps);
              });

  server.Post(R"(/api/projects/([^/]+)/frames/reorder)",
              [deps](const httplib::Request& req, httplib::Response& res) {
                res = handle_reorder_frames(req, deps);
              });

  server.Get(R"(/api/projects/([^/]+)/frames/(\d+))", [deps](const httplib::Request& req,
                                                                 httplib::Response& res) {
    res = handle_get_frame(req, deps);
  });

  server.Put(R"(/api/projects/([^/]+)/frames/(\d+))", [deps](const httplib::Request& req,
                                                                 httplib::Response& res) {
    res = handle_put_frame(req, deps);
  });

  server.Patch(R"(/api/projects/([^/]+)/frames/(\d+)/cells)",
               [deps](const httplib::Request& req, httplib::Response& res) {
                 res = handle_patch_frame_cells(req, deps);
               });

  server.Get(R"(/api/projects/([^/]+)/palette)", [deps](const httplib::Request& req,
                                                           httplib::Response& res) {
    res = handle_get_palette(req, deps);
  });

  server.Put(R"(/api/projects/([^/]+)/palette)", [deps](const httplib::Request& req,
                                                           httplib::Response& res) {
    res = handle_put_palette(req, deps);
  });

  server.Post(R"(/api/projects/([^/]+)/import/pixelate)",
              [deps](const httplib::Request& req, httplib::Response& res) {
                res = handle_import_pixelate(req, deps);
              });

  server.Post(R"(/api/projects/([^/]+)/export/gif)",
              [deps](const httplib::Request& req, httplib::Response& res) {
                res = handle_export_gif(req, deps);
              });
}

}  // namespace pixelanea::api
