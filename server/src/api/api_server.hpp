#pragma once

#include "api/file_dialog_provider.hpp"
#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "domain/types.hpp"
#include "logging/http_request_log.hpp"

#include <httplib.h>

#include <memory>

namespace pixelanea::api {

class ApiServer {
 public:
  ApiServer(db::ProjectRepository& projects, db::FrameRepository& frames,
            db::PaletteRepository& palettes, logging::Logger& logger,
            std::unique_ptr<FileDialogProvider> file_dialog = nullptr);

  void register_routes(httplib::Server& server) const;

 private:
  db::ProjectRepository& projects_;
  db::FrameRepository& frames_;
  db::PaletteRepository& palettes_;
  std::unique_ptr<FileDialogProvider> file_dialog_;
  logging::ScopedLogger log_;
  logging::HttpRequestLog http_request_log_;
};

}  // namespace pixelanea::api
